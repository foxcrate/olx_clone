const mongoose = require("mongoose");
const fs = require("fs");
const thePath = require("../util/path");

const { validationResult } = require("express-validator/check");
const path = require("path");

const Product = require("../models/product");

exports.getAddProduct = (req, res, next) => {
  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    hasError: false,
    errorMessage: null,
    csrfToken: req.csrfToken(),
    validationErrors: [],
  });
};

exports.postAddProduct = (req, res, next) => {
  //console.log(req.files.image);

  if (!req.files) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      product: {
        title: "",
        //imageUrl: imageUrl,
        price: "",
        description: "",
      },
      errorMessage: "no image was selected",
      validationErrors: ["image"],
    });
  }

  const title = req.body.title;
  const image = req.files.image;
  const price = req.body.price;
  const description = req.body.description;
  const errors = validationResult(req);
  //console.log(req.body);
  //return 0;

  const extensionName = path.extname(image.name);
  const allowedExtension = [".png", ".jpg", ".jpeg"];

  if (!allowedExtension.includes(extensionName)) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      product: {
        title: "",
        //imageUrl: imageUrl,
        price: "",
        description: "",
      },
      errorMessage: "wrong image type",
      validationErrors: ["image"],
    });
  }

  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      product: {
        title: title,
        //imageUrl: imageUrl,
        price: price,
        description: description,
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
    });
  }

  let rnd = Date.now();

  image.mv("./uploads/products/images/" + rnd + extensionName, (error) => {
    if (error) {
      console.log(error);
      return res.status(422).render("admin/edit-product", {
        pageTitle: "Add Product",
        path: "/admin/add-product",
        editing: false,
        hasError: true,
        product: {
          title: "",
          //imageUrl: imageUrl,
          price: "",
          description: "",
        },
        errorMessage: "no image was selected",
        validationErrors: ["image"],
      });
    } else {
      console.log("-- image saved successfully --");
    }
  });

  const product = new Product({
    //_id: new mongoose.Types.ObjectId('5badf72403fd8b5be0366e81'),
    title: title,
    price: price,
    description: description,
    imageUrl: "/uploads/products/images/" + rnd + extensionName,
    userId: req.user,
  });
  product
    .save()
    .then((result) => {
      // console.log(result);
      console.log("Created Product");
      return res.redirect("/admin/products");
    })
    .catch((err) => {
      // return res.status(500).render('admin/edit-product', {
      //   pageTitle: 'Add Product',
      //   path: '/admin/add-product',
      //   editing: false,
      //   hasError: true,
      //   product: {
      //     title: title,
      //     imageUrl: imageUrl,
      //     price: price,
      //     description: description
      //   },
      //   errorMessage: 'Database operation failed, please try again.',
      //   validationErrors: []
      // });
      // res.redirect('/500');
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect("/");
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return res.redirect("/");
      }
      res.render("admin/edit-product", {
        pageTitle: "Edit Product",
        path: "/admin/edit-product",
        editing: editMode,
        product: product,
        hasError: false,
        errorMessage: null,
        validationErrors: [],
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  let updatedImageUrl = null;
  const updatedDesc = req.body.description;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Edit Product",
      path: "/admin/edit-product",
      editing: true,
      hasError: true,
      product: {
        title: updatedTitle,
        //imageUrl: updatedImageUrl,
        price: updatedPrice,
        description: updatedDesc,
        _id: prodId,
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
    });
  }

  if (req.files) {
    console.log("--file founded --");

    let image = req.files.image;
    const extensionName = path.extname(image.name);
    const allowedExtension = [".png", ".jpg", ".jpeg"];

    if (!allowedExtension.includes(extensionName)) {
      return res.status(422).render("admin/edit-product", {
        pageTitle: "Edit Product",
        path: "/admin/edit-product",
        editing: true,
        hasError: true,
        product: {
          title: updatedTitle,
          //imageUrl: imageUrl,
          price: updatedPrice,
          description: updatedDesc,
          _id: prodId,
        },
        errorMessage: "wrong image type",
        validationErrors: ["image"],
      });
    }

    let rnd = Date.now();
    updatedImageUrl = "/uploads/products/images/" + rnd + extensionName;

    image.mv("./uploads/products/images/" + rnd + extensionName, (error) => {
      if (error) {
        console.log(error);
        return res.status(422).render("admin/edit-product", {
          pageTitle: "Edit Product",
          path: "/admin/edit-product",
          editing: true,
          hasError: true,
          product: {
            title: updatedTitle,
            //imageUrl: imageUrl,
            price: updatedPrice,
            description: updatedDesc,
            _id: prodId,
          },
          errorMessage: "no image was selected",
          validationErrors: ["image"],
        });
      } else {
        console.log("-- image saved successfully --");
      }
    });
  }

  Product.findById(prodId)
    .then((product) => {
      if (product.userId.toString() !== req.user._id.toString()) {
        return res.redirect("/");
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      if (updatedImageUrl) {
        // let thePath = path.dirname(process.mainModule.filename);
        //console.log({thePath});
        fs.unlink(thePath + product.imageUrl, (err) => {
          if (err) {
            console.log("-- err in deleting image --");
            return next(new Error(err));
          }
        });
        product.imageUrl = updatedImageUrl;
        console.log("-- image updated successfully --");
      }
      return product.save().then((result) => {
        console.log("UPDATED PRODUCT!");
        res.redirect("/admin/products");
      });
    })
    .catch((err) => console.log(err));
};

exports.getProducts = (req, res, next) => {
  Product.find({ userId: req.user._id })
    // .select('title price -_id')
    // .populate('userId', 'name')
    .then((products) => {
      //console.log(products);
      res.render("admin/products", {
        prods: products,
        pageTitle: "Admin Products",
        path: "/admin/products",
      });
    })
    .catch((err) => console.log(err));
};

exports.postDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((theProduct) => {
      fs.unlink(thePath + theProduct.imageUrl, (err) => {
        if (err) {
          console.log("-- err in deleting image --");
          return next(new Error(err));
        }
        console.log("-- image deleted --");
      });
    })
    .catch((err) => console.log(err));

  Product.deleteOne({ _id: prodId, userId: req.user._id })
    .then(() => {
      console.log("DESTROYED PRODUCT");
      res.redirect("/admin/products");
    })
    .catch((err) => console.log(err));
};

exports.deleteProduct = (req, res, next) => {
  console.log("-- accessed from front JS --");
  //return;
  const prodId = req.params.productId;

  Product.findById(prodId)
    .then((theProduct) => {
      fs.unlink(thePath + theProduct.imageUrl, (err) => {
        if (err) {
          console.log("-- err in deleting image --");
          return next(new Error(err));
        }
        console.log("-- image deleted --");
      });
    })
    .catch((err) => console.log(err));

  Product.deleteOne({ _id: prodId, userId: req.user._id })
    .then(() => {
      console.log("DESTROYED PRODUCT");
      // res.redirect("/admin/products");
      res.status(200).json({ msg: "-- success --" });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ msg: "-- error occured --" });
    });
};
