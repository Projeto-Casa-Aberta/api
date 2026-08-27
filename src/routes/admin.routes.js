const express = require("express");
const pool = require("../config/database");
const { senhaAdminValida, registrarAuditoria } = require("./admin.helper");

const router = express.Router();


// ============================================================
// POST /admin/genius/autorizar-dificuldade
// O Genius não tem estado no backend: este endpoint só valida
// a senha e grava a auditoria. O front, de posse da resposta,
// segue com a dificuldade escolhida por conta própria.
// ============================================================

router.post("/genius/autorizar-dificuldade", async (req, res) => {

    try {

        const {
            senha,
            administrador,
            dificuldadeAnterior,
            dificuldadeNova
        } = req.body;


        // ========================================================
        // VALIDAR CAMPOS OBRIGATÓRIOS
        // ========================================================

        if (!administrador) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "O nome do administrador é obrigatório."
            });

        }

        if (dificuldadeNova === undefined) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "dificuldadeNova é obrigatória."
            });

        }


        // ========================================================
        // VERIFICAR SENHA ADMINISTRATIVA
        // ========================================================

        if (!senhaAdminValida(senha)) {

            return res.status(401).json({
                sucesso: false,
                mensagem: "Senha administrativa inválida."
            });

        }


        // ========================================================
        // REGISTRAR AUDITORIA
        // ========================================================

        await registrarAuditoria(pool, {
            administrador,
            acao: "ALTERAR_NIVEL_GENIUS",
            configuracao: "nivel",
            valorAnterior: dificuldadeAnterior,
            valorNovo: dificuldadeNova,
            resultado: "SUCESSO"
        });


        // ========================================================
        // RESPOSTA
        // ========================================================

        return res.status(200).json({
            sucesso: true,
            autorizado: true
        });


    } catch (erro) {

        console.error("Erro ao autorizar dificuldade do Genius:", erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno do servidor."
        });

    }

});


// ============================================================
// POST /admin/auditoria/consultar
// Somente leitura. Não gera registro de auditoria.
// Senha vai no corpo (não na URL) para não vazar em logs.
// ============================================================

router.post("/auditoria/consultar", async (req, res) => {

    try {

        const { senha, administrador, acao, dataInicio, dataFim } = req.body;


        // ========================================================
        // VERIFICAR SENHA ADMINISTRATIVA
        // ========================================================

        if (!senhaAdminValida(senha)) {

            return res.status(401).json({
                sucesso: false,
                mensagem: "Senha administrativa inválida."
            });

        }


        // ========================================================
        // MONTAR FILTROS DINAMICAMENTE
        // ========================================================

        const condicoes = [];
        const valores = [];

        if (administrador) {

            valores.push(administrador);
            condicoes.push(`administrador = $${valores.length}`);

        }

        if (acao) {

            valores.push(acao);
            condicoes.push(`acao = $${valores.length}`);

        }

        if (dataInicio) {

            valores.push(dataInicio);
            condicoes.push(`realizada_em >= $${valores.length}`);

        }

        if (dataFim) {

            valores.push(dataFim);
            condicoes.push(`realizada_em <= $${valores.length}`);

        }

        const where =
            condicoes.length > 0
                ? `WHERE ${condicoes.join(" AND ")}`
                : "";


        // ========================================================
        // CONSULTAR
        // ========================================================

        const resultado = await pool.query(`
            SELECT
                id,
                administrador,
                acao,
                configuracao,
                valor_anterior,
                valor_novo,
                resultado,
                realizada_em
            FROM auditoria_admin
            ${where}
            ORDER BY realizada_em DESC
        `, valores);


        // ========================================================
        // RESPOSTA
        // ========================================================

        return res.status(200).json({
            sucesso: true,
            registros: resultado.rows
        });


    } catch (erro) {

        console.error("Erro ao consultar auditoria:", erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno do servidor."
        });

    }

});


// ============================================================
// POST /admin/limpar-banco
// Chama a function limpar_banco() (DELETE FROM equipes) e
// registra a auditoria na mesma transação. auditoria_admin
// nunca é apagada.
// ============================================================

router.post("/limpar-banco", async (req, res) => {

    const client = await pool.connect();

    try {

        const { senha, administrador } = req.body;


        // ========================================================
        // VALIDAR CAMPOS OBRIGATÓRIOS
        // ========================================================

        if (!administrador) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "O nome do administrador é obrigatório."
            });

        }


        // ========================================================
        // VERIFICAR SENHA ADMINISTRATIVA
        // ========================================================

        if (!senhaAdminValida(senha)) {

            return res.status(401).json({
                sucesso: false,
                mensagem: "Senha administrativa inválida."
            });

        }


        // ========================================================
        // LIMPAR BANCO + AUDITORIA
        // ========================================================

        await client.query("BEGIN");

        const resultado = await client.query(
            "SELECT limpar_banco() AS linhas_apagadas"
        );

        const linhasApagadas =
            resultado.rows[0].linhas_apagadas;


        await registrarAuditoria(client, {
            administrador,
            acao: "LIMPAR_BANCO",
            configuracao: "equipes",
            valorAnterior: linhasApagadas,
            valorNovo: 0,
            resultado: "SUCESSO"
        });


        await client.query("COMMIT");


        // ========================================================
        // RESPOSTA
        // ========================================================

        return res.status(200).json({
            sucesso: true,
            mensagem: "Banco de dados limpo.",
            linhasApagadas
        });


    } catch (erro) {

        await client.query("ROLLBACK");

        console.error("Erro ao limpar banco:", erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno do servidor."
        });

    } finally {

        client.release();

    }

});


module.exports = router;