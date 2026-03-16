const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;
const PORT = process.env.PORT || 3000;

app.post('/cod-order', async (req, res) => {
  try {
    const {
      firstName, lastName, phone,
      address, city, province,
      variantId, orderSource
    } = req.body;

    const orderPayload = {
      order: {
        line_items: [{
          variant_id: variantId,
          quantity: 1
        }],
        customer: {
          first_name: firstName,
          last_name: lastName,
          phone: phone
        },
        billing_address: {
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          address1: address,
          city: city,
          province: province || '',
          country: 'PK'
        },
        shipping_address: {
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          address1: address,
          city: city,
          province: province || '',
          country: 'PK'
        },
        financial_status: 'pending',
        tags: orderSource === 'whatsapp' ? 'COD-WHATSAPP' : 'COD',
        note: orderSource === 'whatsapp'
          ? 'Cash on Delivery order placed via WhatsApp'
          : 'Cash on Delivery order placed via website',
        send_receipt: false,
        send_fulfillment_receipt: false
      }
    };

    const response = await fetch(
      `https://${SHOPIFY_STORE}.myshopify.com/admin/api/2024-01/orders.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': SHOPIFY_TOKEN
        },
        body: JSON.stringify(orderPayload)
      }
    );

    const data = await response.json();

    if (data.order) {
      res.json({
        success: true,
        orderId: data.order.id,
        orderName: data.order.name
      });
    } else {
      res.status(400).json({ success: false, error: data });
    }

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log('Velorea COD server running on port ' + PORT);
});
