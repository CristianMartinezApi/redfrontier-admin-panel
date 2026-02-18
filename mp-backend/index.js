// Backend seguro para buscar pagamentos do Mercado Pago

// Instale as dependências: npm install express axios cors dotenv

const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = 3001; // Porta do backend

// Access Token do Mercado Pago via variável de ambiente
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
if (!MP_ACCESS_TOKEN) {
  throw new Error("MP_ACCESS_TOKEN não definido no arquivo .env");
}

app.use(cors());

// Endpoint para buscar pagamentos
app.get("/pagamentos", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.mercadopago.com/v1/payments/search",
      {
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        },
        params: {
          sort: "date_created",
          criteria: "desc",
          limit: 20, // Altere conforme necessário
        },
      },
    );
    res.json(response.data);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Erro ao buscar pagamentos", details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend do Mercado Pago rodando na porta ${PORT}`);
});
