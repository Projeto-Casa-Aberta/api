const express = require("express");
const pool = require("../config/database");

const router = express.Router();


// ============================================================
// POST /genius/partidas
// ============================================================

router.post("/partidas", async (req, res) => {

    try {

        const {
            nome,
            nivel,
            coresAcertadas,
            tempo
        } = req.body;


        // ========================================================
        // VALIDAÇÕES
        // ========================================================

        if (
            nome === undefined ||
            nivel === undefined ||
            coresAcertadas === undefined ||
            tempo === undefined
        ) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "Nome, nível, cores acertadas e tempo são obrigatórios."
            });

        }


        // ========================================================
        // VALIDAR TIPOS
        // ========================================================

        if (
            typeof nome !== "string" ||
            !Number.isInteger(nivel) ||
            !Number.isInteger(coresAcertadas) ||
            !Number.isInteger(tempo)
        ) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "Nome deve ser uma string e nível, cores acertadas e tempo devem ser números inteiros."
            });

        }


        // ========================================================
        // VALIDAR VALORES
        // ========================================================

        if (nome.trim().length === 0) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "O nome não pode estar vazio."
            });

        }


        if (nivel < 0) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "O nível não pode ser negativo."
            });

        }


        if (coresAcertadas < 0) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "O número de cores acertadas não pode ser negativo."
            });

        }


        if (tempo <= 0) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "O tempo deve ser maior que zero."
            });

        }


        // ========================================================
        // SALVAR PARTIDA
        // ========================================================

        const resultado = await pool.query(`
            INSERT INTO genius_competitivo (
                nome,
                nivel_concluido,
                cores_acertadas,
                tempo
            )
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `, [
            nome.trim(),
            nivel,
            coresAcertadas,
            tempo
        ]);


        // ========================================================
        // RESPOSTA
        // ========================================================

        return res.status(201).json({
            sucesso: true,
            partidaId: resultado.rows[0].id
        });


    } catch (erro) {

        console.error("Erro ao registrar partida do Genius:", erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno do servidor."
        });

    }

});


// ============================================================
// GET /genius/ranking
// ============================================================

router.get("/ranking", async (req, res) => {

    try {

        const resultado = await pool.query(`
            SELECT
                nome,
                nivel_concluido,
                cores_acertadas,
                tempo
            FROM genius_competitivo
            ORDER BY
                nivel_concluido DESC,
                cores_acertadas DESC,
                tempo ASC
        `);


        // ========================================================
        // MONTAR RANKING
        // ========================================================

        const ranking = resultado.rows.map((partida, index) => {

            return {
                posicao: index + 1,
                nome: partida.nome,
                nivel: partida.nivel_concluido,
                coresAcertadas: partida.cores_acertadas,
                tempo: partida.tempo
            };

        });


        // ========================================================
        // RESPOSTA
        // ========================================================

        return res.status(200).json({
            ranking
        });


    } catch (erro) {

        console.error("Erro ao buscar ranking do Genius:", erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno do servidor."
        });

    }

});


module.exports = router;