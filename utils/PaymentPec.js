var soap = require("soap");
const config = require("config");
const pecPardakht = config.get("APAMAN.payPecConfig");
const logger = require("./winstonLogger");

module.exports = {
  createPaymentRequest: (params, callBackUrl) => {
    return {
      requestData: {
        LoginAccount: pecPardakht.LOGIN_ACCOUNT,
        Amount: params.amount,
        OrderId: params.orderId,
        CallBackUrl: callBackUrl,
        AdditionalData: "",
      },
    };
  },
  requestPayment: (requestParams, callBack) => {
    logger.info(
      "************PaymentPec requestPayment Start %j: ",
      requestParams
    );
    soap.createClient(pecPardakht.URL_SERVICE, function (err, client) {
      if (err)
        logger.error("************PaymentPec createClient ERR %s: ", err);
      else {
        client.SalePaymentRequest(requestParams, function (err, response) {
          if (err)
            logger.error(
              "************PaymentPec SalePaymentRequest ERR %s: ",
              err
            );
          else {
            logger.info(
              "************PaymentPec SalePaymentRequest response: %j: ",
              response
            );
            response = Object.assign(response, {
              urlPayment: pecPardakht.URL_PAYMENT,
            });

            const token = Number(response.SalePaymentRequestResult.Token);
            const status = Number(response.SalePaymentRequestResult.Status);
            if (token > 0 && status === 0) {
              return callBack(false, {
                tokenPay: token,
                urlPay: pecPardakht.URL_PAYMENT,
              });
            } else {
              // if (status === -112) this.requestReversePayment(this.createConfirmReverseRequest())
              return callBack(
                " درگاه پرداخت: " + response.SalePaymentRequestResult.Message
              );
            }
          }
        });
      }
    });
  },

  createConfirmReverseRequest: (token) => {
    return {
      requestData: {
        LoginAccount: pecPardakht.LOGIN_ACCOUNT,
        Token: token,
      },
    };
  },
  requestConfirmPayment: (requestParams, callBack) => {
    logger.info(
      "************PaymentPec requestConfirmPayment Start %j: ",
      requestParams
    );
    soap.createClient(pecPardakht.URL_CONFIRM, function (err, client) {
      if (err)
        logger.error("************PaymentPec createClient ERR %s: ", err);
      else {
        client.ConfirmPayment(requestParams, function (err, response) {
          if (err)
            logger.error("************PaymentPec ConfirmPayment ERR %s: ", err);
          else {
            logger.info(
              "************PaymentPec ConfirmPayment response: %j: ",
              response
            );
            const RRN = Number(response.ConfirmPaymentResult.RRN);
            const status = Number(response.ConfirmPaymentResult.Status);
            if (RRN > 0 && status === 0) {
              return callBack(false, response);
            } else {
              let errMessage =
                status === -1533
                  ? "تراکنش قبلاً تایید شده است."
                  : "خطا در ثبت نهایی تراکنش";
              return callBack(" درگاه پرداخت: " + errMessage);
            }
          }
        });
      }
    });
  },

  requestReversePayment: (requestParams, callBack) => {
    logger.info(
      "************PaymentPec request ReversePayment Start %j: ",
      requestParams
    );
    soap.createClient(pecPardakht.URL_REVERS, function (err, client) {
      if (err)
        logger.error("************PaymentPec createClient ERR %s: ", err);
      else {
        // console.error("************createClient client: ", client);
        client.ReversalRequest(requestParams, function (err, response) {
          if (err)
            logger.error("************PaymentPec ReversePayment ERR %s: ", err);
          else {
            logger.info(
              "************PaymentPec ReversePayment response: %j: ",
              response
            );
            return callBack(response);
          }
        });
      }
    });
  },
};
