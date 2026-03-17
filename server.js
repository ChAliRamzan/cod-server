const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;
const PORT = process.env.PORT || 3000;

setInterval(function() {
  fetch('https://velorea-cod.onrender.com/ping').catch(function() {});
}, 840000);

app.get('/ping', function(req, res) {
  res.json({ status: 'awake', time: new Date().toISOString() });
});

app.get('/check', function(req, res) {
  res.json({
    store: SHOPIFY_STORE ? SHOPIFY_STORE : 'NOT SET',
    token: SHOPIFY_TOKEN ? 'SET (starts with: ' + SHOPIFY_TOKEN.substring(0, 10) + '...)' : 'NOT SET',
    time: new Date().toISOString()
  });
});

app.post('/cod-order', async (req, res) => {
  try {
    const {
      firstName, lastName, email, phone,
      address, city, province,
      variantId, orderSource, productTitle
    } = req.body;

    console.log('Received order:', JSON.stringify(req.body));

    // Guest order - no customer object to avoid duplicate conflicts
    const orderPayload = {
      order: {
        line_items: [{
          variant_id: parseInt(variantId),
          quantity: 1
        }],
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
        email: email || (phone + '@veloreacare.com'),
        financial_status: 'pending',
        tags: orderSource === 'whatsapp' ? 'COD-WHATSAPP' : 'COD',
        note: (orderSource === 'whatsapp'
          ? 'COD via WhatsApp'
          : 'COD via website') + (email ? ' | Email: ' + email : '') + ' | Phone: ' + phone,
        send_receipt: false,
        send_fulfillment_receipt: false
      }
    };

    console.log('Sending to Shopify:', JSON.stringify(orderPayload));

    const response = await fetch(
      `https://${SHOPIFY_STORE}.myshopify.com/admin/api/2023-10/orders.json`,
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
    console.log('Shopify response:', JSON.stringify(data));

    if (data.order) {
      res.json({ success: true, orderId: data.order.id, orderName: data.order.name });
    } else {
      console.error('Shopify error:', JSON.stringify(data));
      res.status(400).json({ success: false, error: data });
    }

  } catch (err) {
    console.error('Server error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log('Velorea COD server running on port ' + PORT);
});
