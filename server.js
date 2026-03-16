const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;
const PORT = process.env.PORT || 3000;

// Keep alive
setInterval(function() {
  fetch('https://velorea-cod.onrender.com/ping').catch(function() {});
}, 840000);

app.get('/ping', function(req, res) {
  res.json({ status: 'awake' });
});

app.post('/cod-order', async (req, res) => {
  try {
    const {
      firstName, lastName, phone,
      address, city, province,
      variantId, orderSource, productTitle
    } = req.body;

    console.log('Received order:', JSON.stringify(req.body));

    // Step 1: Check if customer exists by phone
    let customerId = null;
    try {
      const searchRes = await fetch(
        `https://${SHOPIFY_STORE}.myshopify.com/admin/api/2023-10/customers/search.json?query=phone:${encodeURIComponent(phone)}&limit=1`,
        {
          headers: {
            'X-Shopify-Access-Token': SHOPIFY_TOKEN
          }
        }
      );
      const searchData = await searchRes.json();
      if (searchData.customers && searchData.customers.length > 0) {
        customerId = searchData.customers[0].id;
        console.log('Found existing customer:', customerId);
      }
    } catch(e) {
      console.log('Customer search error (non-fatal):', e.message);
    }

    // Step 2: Build order payload
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
        financial_status: 'pending',
        tags: orderSource === 'whatsapp' ? 'COD-WHATSAPP' : 'COD',
        note: orderSource === 'whatsapp'
          ? 'Cash on Delivery order placed via WhatsApp'
          : 'Cash on Delivery order placed via website',
        send_receipt: false,
        send_fulfillment_receipt: false
      }
    };

    // Attach existing customer or create new one
    if (customerId) {
      orderPayload.order.customer = { id: customerId };
    } else {
      orderPayload.order.customer = {
        first_name: firstName,
        last_name: lastName,
        phone: phone
      };
    }

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
