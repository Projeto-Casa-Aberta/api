const express = require("express");
console.log(">>> TERMINAL.ROUTES CARREGADO");
const cors = require("cors");
const pool = require("./config/database");

require("dotenv").config();

const terminalRoutes = require("./routes/terminal.routes");
const geniusRoutes = require("./routes/genius.routes");
const adminRoutes = require("./routes/admin.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/terminal", terminalRoutes);
app.use("/genius", geniusRoutes);
app.use("/admin", adminRoutes);


app.get("/", (req, res) => {
    res.json({
        sucesso: true,
        mensagem: "API Casa Aberta Senac funcionando!"
    });
});

app.get("/teste-banco", async (req, res) => {

    try {

        const resultado = await pool.query("SELECT NOW()");

        res.json({
            sucesso: true,
            mensagem: "Conexão com o banco funcionando!",
            horarioBanco: resultado.rows[0].now
        });

    } catch (erro) {

        console.error("Erro ao conectar ao banco:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao conectar ao banco."
        });

    }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`API rodando em http://localhost:${PORT}`);
});