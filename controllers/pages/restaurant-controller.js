const { Restaurant, Category, Comment, User, Favorite } = require('../../models')
const restaurantServices = require('../../services/restaurant-services')
const restaurantController = {
  getRestaurants: (req, res, next) => {
    restaurantServices.getRestaurants(req, (err, data) => err ? next(err) : res.render('restaurants', data))
  },
  getRestaurant: (req, res, next) => {
    return Restaurant.findByPk(req.params.id, {
      include: [
        Category,
        { model: Comment, include: User },
        { model: User, as: 'FavoritedUsers' },
        { model: User, as: 'LikedUsers' }
      ] // 拿出關聯的 Category model
      // nest: true,
      // raw: true
    })
      .then(restaurant => {
        //console.log(restaurant.Comments[0].dataValues)
        if (!restaurant) throw new Error("Restaurant didn't exist!")
        return restaurant.increment('viewCount')
      })
      .then(restaurant => {
        const isFavorited = restaurant.FavoritedUsers.some(f => f.id === req.user.id)
        const isLiked = restaurant.LikedUsers.some(l => l.id === req.user.id)
        /**
         * 這裡我們是使用 some 方法來操作陣列。使用 some 的好處是只要帶迭代過程中找到一個符合條件的項目後，就會立刻回傳 true，後面的項目不會繼續執行。
         * 比起 map 方法無論如何都會從頭到尾把陣列裡的項目執行一次，some 因為加入了判斷條件 f.id === req.user.id，可以有效減少執行次數。
         **/
        res.render('restaurant', {
          restaurant: restaurant.toJSON(),
          isFavorited,
          isLiked
        })
      })
      .catch(err => next(err))
  },
  getDashboard: (req, res, next) => {
    return Restaurant.findByPk(req.params.id, {
      include: [
        Category,
        Comment,
        { model: User, as: 'FavoritedUsers' }
      ]
    })
      .then(restaurant => {
        if (!restaurant) throw new Error("Restaurant didn't exist!")
        const data = ({
          ...restaurant.toJSON(),
          favoritedCount: restaurant.FavoritedUsers.length,
          commentedCount: restaurant.Comments.length
        })
        return res.render('dashboard', { restaurant: data })
      })
      .catch(err => next(err))
  },
  getFeeds: (req, res, next) => {
    return Promise.all([
      Restaurant.findAll({
        limit: 10,
        order: [['createdAt', 'DESC']],
        include: [Category],
        raw: true,
        nest: true
      }),
      Comment.findAll({
        limit: 10,
        order: [['createdAt', 'DESC']],
        include: [User, Restaurant],
        raw: true,
        nest: true
      })
    ])
      .then(([restaurants, comments]) => {
        res.render('feeds', {
          restaurants,
          comments
        })
      })
      .catch(err => next(err))
  },
  getTopRestaurants: (req, res, next) => {
    return Restaurant.findAll({
      include: [{
        model: User,
        as: 'FavoritedUsers'
      }]
    })
      .then(restaurants => {
        restaurants = restaurants.map(r => ({
          ...r.dataValues,
          description: r.dataValues.description.substring(0, 50),
          favoritedCount: r.FavoritedUsers.length,
          isFavorited: req.user && req.user.FavoritedRestaurants.map(d => d.id).includes(r.id)
        }))
        restaurants.sort((a, b) => b.favoritedCount - a.favoritedCount)
        restaurants = restaurants.slice(0, 10)
        res.render('top-restaurants', { restaurants })
      })
      .catch(err => next(err))
  }
}
module.exports = restaurantController