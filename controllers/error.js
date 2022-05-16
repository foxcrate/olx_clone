exports.get404 = (req, res, next) => {
  res.status(404).render('404', {
    pageTitle: 'Page Not Found',
    path: '/404',
    isAuthenticated: req.session.isLoggedIn
  });
};

exports.get500 = (req, res, next) => {
  let message = req.flash('500Error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  //console.log(message);
  // let error = req.query.error;
  // console.log({error});
  // return 0;
  res.status(500).render('500', {
    pageTitle: 'Error!',
    path: '/500',
    isAuthenticated: req.session.isLoggedIn,
    errorMessage:  message
  });
};
