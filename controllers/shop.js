const path = require("path");
const fs = require("fs");
const pdfDocument = require("pdfkit");
const stripe = require("stripe")(
  "sk_test_51KsiHCHji5VpLEv2KqJxY60b7AIu0ZTjlRj9pXbPAOM3h0VsmZNP6VM5TyuQzstdKxdUpNJDAypbOLsZ5hiiRs6c00tjuVh6Qz"
);
const crypto = require("crypto");

const thePath = require("../util/path");
const Product = require("../models/product");
const Order = require("../models/order");

exports.getProducts = (req, res, next) => {
  // console.log(req.query.page  );
  let pageNumber = parseInt(req.query.page);
  //console.log({ pageNumber });

  let productsPerPage = parseInt(process.env.PRODUCTS_PER_PAGE);
  //console.log({ productsPerPage });
  let productsCount = 0;

  Product.find()
    .countDocuments()
    .then((x) => {
      productsCount = x;
      //console.log("Last Page: ", Math.ceil(productsCount / productsPerPage));
      return Product.find()
        .skip((pageNumber - 1) * productsPerPage)
        .limit(productsPerPage);
    })
    .then((products) => {
      //console.log(products);
      res.render("shop/product-list", {
        prods: products,
        pageTitle: "All Products",
        path: "/products",
        firstPage: 1,
        previousPage: pageNumber - 1,
        currentPage: pageNumber,
        nextPage: pageNumber + 1,
        lastPage: Math.ceil(productsCount / productsPerPage),
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      res.render("shop/product-detail", {
        product: product,
        pageTitle: product.title,
        path: "/products",
      });
    })
    .catch((err) => console.log(err));
};

// exports.getIndex = (req, res, next) => {
//   let pageNumber = req.query.page;
//   console.log({pageNumber});
//   Product.find()
//     .then(products => {
//       res.render('shop/index', {
//         prods: products,
//         pageTitle: 'Shop',
//         path: '/'
//       });
//     })
//     .catch(err => {
//       console.log(err);
//     });
// };

exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      const products = user.cart.items;
      res.render("shop/cart", {
        path: "/cart",
        pageTitle: "Your Cart",
        products: products,
      });
    })
    .catch((err) => console.log(err));
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then((result) => {
      //console.log(result);
      res.redirect("/cart");
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => console.log(err));
};

exports.postOrder = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      const products = user.cart.items.map((i) => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user,
        },
        products: products,
      });
      return order.save();
    })
    .then((result) => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch((err) => console.log(err));
};

exports.getOrders = (req, res, next) => {
  Order.find({ "user.userId": req.user._id })
    .then((orders) => {
      res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Your Orders",
        orders: orders,
      });
    })
    .catch((err) => console.log(err));
};

exports.getInvoice = (req, res, next) => {
  let orderId = req.params.orderId;
  let userId = req.user._id;
  Order.findById(orderId)
    .then((theOrder) => {
      //console.log({theOrder});
      if (theOrder.user.userId.toString() !== userId.toString()) {
        //req.errorMsg = 'Unauthorized User';
        req.flash("500Error", "Unauthorized User");
        let tt = "Unauthorized User";
        //return next(new Error('Unauthorized User'));
        return res.redirect("/500/?error=" + tt);
      }
      let invoiceName = "invoice-" + orderId + ".pdf";
      let invoicePath = path.join("data", "invoices", invoiceName);
      //console.log(invoicePath);

      // fs.readFile(invoicePath,(error,data)=>{
      //   if(error){
      //     console.log(error);
      //     return next(error)
      //   }
      //   //console.log(data);
      //   res.setHeader('Content-Type','application/pdf');
      //   res.setHeader('Content-Disposition','inline; filename="'+invoiceName+'"')
      //   res.send(data);
      // })

      //const file = fs.createReadStream(invoicePath)
      // res.setHeader('Content-Type','application/pdf');
      // res.setHeader('Content-Disposition','inline; filename="'+invoiceName+'"')
      //file.pipe(res);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'inline; filename="' + invoiceName + '"'
      );

      pdfDoc = new pdfDocument();
      pdfDoc.pipe(fs.createWriteStream(invoicePath), (err) => {
        console.log(err);
      });
      pdfDoc.pipe(res);

      pdfDoc.fontSize(26).text("Invoice");
      let totalPrice = 0;

      theOrder.products.forEach((prod) => {
        totalPrice = totalPrice + prod.quantity + prod.product.price;
        pdfDoc.text(
          prod.product.title +
            " - x" +
            prod.quantity +
            " --> $" +
            prod.product.price
        );
      });
      pdfDoc.text("----- -----");
      pdfDoc.text("Total price: $" + totalPrice);

      pdfDoc.end();
    })
    .catch((err) => {
      console.log(err);
      return next(new Error(err));
    });
};

exports.getCheckout = (req, res, next) => {
  let totalPrice = 0;
  let products;

  // let userPassword = req.user.password[30];
  // console.log(userPassword);

  const paymentSecretCode = crypto.randomBytes(16).toString("hex");
  //console.log(paymentSecretCode);

  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      products = user.cart.items;
      products.forEach((p) => {
        totalPrice += p.productId.price * p.quantity;
      });
      //console.log(totalPrice);

      return stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: products.map((p) => {
          return {
            name: p.productId.title,
            description: p.productId.description,
            amount: p.productId.price * 100,
            currency: "usd",
            quantity: p.quantity,
          };
        }),
        success_url:
          req.protocol + "://" + req.get("host") + "/checkout/success",
        cancel_url: req.protocol + "://" + req.get("host") + "/checkout/cancel",
      });
    })
    .then((session) => {
      res.render("shop/checkout", {
        path: "/checkout",
        pageTitle: "Checkout",
        products: products,
        totalPrice: totalPrice,
        sessionId: session.id,
      });
    })
    .catch((err) => console.log(err));
};

exports.getCheckoutSuccess = (req, res, next) => {
  console.log("-- checkcout success --");
};

exports.getCheckoutCancel = (req, res, next) => {
  console.log("-- checkcout cancel --");
};
