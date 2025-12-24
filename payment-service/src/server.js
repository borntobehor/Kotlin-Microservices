import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const app = express();

app.use(express.json());

const PORT = process.env.ORDER_PORT || 5000;
const orderService_URL =  process.env.ORDER_SERVICE_URL || "https://perfume-order.onrender.com/orders";

app.post("/payment/:perfumeID", async (req, res) => {
  const perfumeID = req.params.perfumeID;

  try {
    const orderResponse = await axios.get(`${orderService_URL}/${perfumeID}`);

    const orderData = orderResponse.data;

    const paymentSuccess = true;

    if (paymentSuccess) {
      res.json({
        success: true,
        message: "Payment completed successfully! ✓",
        order: orderData,
        paymentDetails: {
          transactionId: "txn_" + Math.random().toString(36).substr(2, 9),
          amount: orderData.total,
          status: "paid",
        },
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Payment failed !",
      error: "Could not place order or service unavailable",
    });
  }
});

app.get("/health", (req, res) => {
  res.json(
    { 
      status: "Payment Service is healthy!" ,
      port: PORT,
      orderServiceConnectedTo: orderService_URL,
    }
  );
});

app.listen(PORT, () => {
  console.log(`Payment Service running on port ${PORT}`);
});
