const express = require("express");
const pool = require("../config/database");

const router = express.Router();


// ============================================================
// POST /terminal/iniciar
// ============================================================

router.post("/iniciar", async (req, res) => {

    const client = await pool.connect();

    try {

        const { nome, codigoCor } = req.body;


        // ========================================================
        // VALIDAÇÕES
        // ========================================================

        if (!nome || !codigoCor) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "Nome e código da cor são obrigatórios."
            });

        }

        const codigo = codigoCor.toUpperCase();


        if (!/^[0-9A-F]{6}$/.test(codigo)) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "codigoCor deve conter exatamente 6 caracteres hexadecimais."
            });

        }


        // ========================================================
        // TRANSFORMAR O CÓDIGO EM ARRAY DE CARACTERES
        // ========================================================

        const caracteres = codigo.split("");


        // ========================================================
        // EMBARALHAR OS 6 CARACTERES
        // Fisher-Yates
        // ========================================================

        for (let i = caracteres.length - 1; i > 0; i--) {

            const j = Math.floor(Math.random() * (i + 1));

            [caracteres[i], caracteres[j]] =
                [caracteres[j], caracteres[i]];

        }


        // ========================================================
        // FORMAR OS 3 PARES
        // ========================================================

        const codigoTerminal1 =
            caracteres[0] + caracteres[1];

        const codigoTerminal2 =
            caracteres[2] + caracteres[3];

        const codigoTerminal3 =
            caracteres[4] + caracteres[5];


        // ========================================================
        // INICIAR TRANSAÇÃO
        // ========================================================

        await client.query("BEGIN");


        // ========================================================
        // VERIFICAR EQUIPE EM ANDAMENTO
        // ========================================================

        const equipeAtiva = await client.query(`
            SELECT id
            FROM equipes
            WHERE status = 'EM_ANDAMENTO'
            LIMIT 1
        `);


        if (equipeAtiva.rows.length > 0) {

            await client.query("ROLLBACK");

            return res.status(409).json({
                sucesso: false,
                mensagem: "Já existe uma equipe em andamento."
            });

        }


        // ========================================================
        // CRIAR EQUIPE
        // ========================================================

        const resultado = await client.query(`
            INSERT INTO equipes (
                nome,
                codigo_cor,
                codigo_terminal_1,
                codigo_terminal_2,
                codigo_terminal_3,
                status
            )
            VALUES ($1, $2, $3, $4, $5, 'EM_ANDAMENTO')
            RETURNING id, status
        `, [
            nome,
            codigo,
            codigoTerminal1,
            codigoTerminal2,
            codigoTerminal3
        ]);


        // ========================================================
        // CONFIRMAR TRANSAÇÃO
        // ========================================================

        await client.query("COMMIT");


        const equipe = resultado.rows[0];


        // ========================================================
        // RESPOSTA
        // ========================================================

        return res.status(201).json({
            sucesso: true,
            equipeId: equipe.id,
            status: equipe.status
        });


    } catch (erro) {

        await client.query("ROLLBACK");

        console.error("Erro ao iniciar equipe:", erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno do servidor."
        });

    } finally {

        client.release();

    }

});


// ============================================================
// BUSCAR CÓDIGO DE UM TERMINAL
// ============================================================

async function buscarCodigoTerminal(req, res, numeroTerminal) {

    try {

        const coluna = `codigo_terminal_${numeroTerminal}`;

        const resultado = await pool.query(`
            SELECT ${coluna}
            FROM equipes
            WHERE status = 'EM_ANDAMENTO'
            LIMIT 1
        `);


        if (resultado.rows.length === 0) {

            return res.status(404).json({
                sucesso: false,
                mensagem: "Não existe equipe ativa."
            });

        }


        return res.status(200).json({
            codigo: resultado.rows[0][coluna]
        });


    } catch (erro) {

        console.error(
            `Erro ao buscar código do Terminal ${numeroTerminal}:`,
            erro
        );

        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno do servidor."
        });

    }

}


// ============================================================
// GET /terminal/1
// ============================================================

router.get("/1", async (req, res) => {

    await buscarCodigoTerminal(req, res, 1);

});


// ============================================================
// GET /terminal/2
// ============================================================

router.get("/2", async (req, res) => {

    await buscarCodigoTerminal(req, res, 2);

});


// ============================================================
// GET /terminal/3
// ============================================================

router.get("/3", async (req, res) => {

    await buscarCodigoTerminal(req, res, 3);

});

// ============================================================
// BUSCAR STATUS DE UM TERMINAL
// ============================================================

async function buscarStatusTerminal(req, res, numeroTerminal) {

    try {

        const coluna = `terminal_${numeroTerminal}_finalizado`;

        const resultado = await pool.query(`
            SELECT
                id,
                status,
                entrada_em,
                ${coluna}
            FROM equipes
            WHERE status = 'EM_ANDAMENTO'
               OR status = 'EXPIRADO'
            ORDER BY id DESC
            LIMIT 1
        `);


        // ========================================================
        // NENHUMA EQUIPE ENCONTRADA
        // ========================================================

        if (resultado.rows.length === 0) {

            return res.status(404).json({
                sucesso: false,
                mensagem: "Não existe equipe ativa."
            });

        }


        const equipe = resultado.rows[0];


        // ========================================================
        // VERIFICAR LIMITE DE 10 MINUTOS
        // ========================================================

        if (equipe.status === "EM_ANDAMENTO") {

            const entrada = new Date(equipe.entrada_em);

            const agora = new Date();

            const tempoDecorrido =
                agora.getTime() - entrada.getTime();

            const DEZ_MINUTOS = 10 * 60 * 1000;


            if (tempoDecorrido >= DEZ_MINUTOS) {

                await pool.query(`
                    UPDATE equipes
                    SET status = 'EXPIRADO'
                    WHERE id = $1
                      AND status = 'EM_ANDAMENTO'
                `, [equipe.id]);


                return res.status(200).json({
                    status: "EXPIRADO",
                    concluido: false
                });

            }

        }


        // ========================================================
        // EQUIPE EXPIRADA
        // ========================================================

        if (equipe.status === "EXPIRADO") {

            return res.status(200).json({
                status: "EXPIRADO",
                concluido: false
            });

        }


        // ========================================================
        // EQUIPE ATIVA
        // ========================================================

        return res.status(200).json({
            status: "ATIVO",
            concluido: equipe[coluna]
        });


    } catch (erro) {

        console.error(
            `Erro ao consultar status do Terminal ${numeroTerminal}:`,
            erro
        );

        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno do servidor."
        });

    }

}


// ============================================================
// GET /terminal/1/status
// ============================================================

router.get("/1/status", async (req, res) => {

    await buscarStatusTerminal(req, res, 1);

});


// ============================================================
// GET /terminal/2/status
// ============================================================

router.get("/2/status", async (req, res) => {

    await buscarStatusTerminal(req, res, 2);

});


// ============================================================
// GET /terminal/3/status
// ============================================================

router.get("/3/status", async (req, res) => {

    await buscarStatusTerminal(req, res, 3);

});

// ============================================================
// CONCLUIR TERMINAL
// ============================================================

async function concluirTerminal(req, res, numeroTerminal) {

    const client = await pool.connect();

    try {

        // ========================================================
        // VERIFICAR EQUIPE
        // ========================================================

        const resultadoEquipe = await client.query(`
            SELECT
                id,
                status,
                entrada_em
            FROM equipes
            WHERE status = 'EM_ANDAMENTO'
            LIMIT 1
        `);


        if (resultadoEquipe.rows.length === 0) {

            return res.status(404).json({
                sucesso: false,
                mensagem: "Não existe equipe em andamento."
            });

        }


        const equipe = resultadoEquipe.rows[0];


        // ========================================================
        // VERIFICAR TEMPO
        // ========================================================

        const entrada = new Date(equipe.entrada_em);
        const agora = new Date();

        const tempoDecorrido =
            agora.getTime() - entrada.getTime();

        const DEZ_MINUTOS = 10 * 60 * 1000;


        if (tempoDecorrido >= DEZ_MINUTOS) {

            await client.query(`
                UPDATE equipes
                SET status = 'EXPIRADO'
                WHERE id = $1
                  AND status = 'EM_ANDAMENTO'
            `, [equipe.id]);


            return res.status(410).json({
                sucesso: false,
                mensagem: "O tempo da equipe expirou."
            });

        }


        // ========================================================
        // TERMINAL 1
        // ========================================================

        if (numeroTerminal === 1) {

            const { nivel } = req.body;


            if (nivel !== 10) {

                return res.status(400).json({
                    sucesso: false,
                    mensagem: "O Terminal 1 só pode ser concluído no nível 10."
                });

            }

        }


        // ========================================================
        // INICIAR TRANSAÇÃO
        // ========================================================

        await client.query("BEGIN");


        // ========================================================
        // MARCAR TERMINAL COMO CONCLUÍDO
        // ========================================================

        const coluna = `terminal_${numeroTerminal}_finalizado`;

        const resultado = await client.query(`
            UPDATE equipes
            SET ${coluna} = TRUE
            WHERE id = $1
            RETURNING ${coluna}
        `, [equipe.id]);


        await client.query("COMMIT");


        // ========================================================
        // RESPOSTA
        // ========================================================

        return res.status(200).json({
            sucesso: true,
            concluido: resultado.rows[0][coluna]
        });


    } catch (erro) {

        await client.query("ROLLBACK");

        console.error(
            `Erro ao concluir Terminal ${numeroTerminal}:`,
            erro
        );

        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno do servidor."
        });

    } finally {

        client.release();

    }

}


// ============================================================
// POST /terminal/1/concluir
// ============================================================

router.post("/1/concluir", async (req, res) => {

    await concluirTerminal(req, res, 1);

});


// ============================================================
// POST /terminal/2/concluir
// ============================================================

router.post("/2/concluir", async (req, res) => {

    await concluirTerminal(req, res, 2);

});


// ============================================================
// POST /terminal/3/concluir
// ============================================================

router.post("/3/concluir", async (req, res) => {

    await concluirTerminal(req, res, 3);

});

// ============================================================
// POST /terminal/validar
// ============================================================

router.post("/validar", async (req, res) => {

    const client = await pool.connect();

    try {

        const { codigo } = req.body;


        // ========================================================
        // VALIDAR CÓDIGO RECEBIDO
        // ========================================================

        if (!codigo) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "O código é obrigatório."
            });

        }

        const codigoRecebido = codigo.toUpperCase();


        if (!/^[0-9A-F]{6}$/.test(codigoRecebido)) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "O código deve conter exatamente 6 caracteres hexadecimais."
            });

        }


        // ========================================================
        // BUSCAR EQUIPE EM ANDAMENTO
        // ========================================================

        const resultadoEquipe = await client.query(`
            SELECT
                id,
                codigo_cor,
                status,
                entrada_em,
                terminal_1_finalizado,
                terminal_2_finalizado,
                terminal_3_finalizado
            FROM equipes
            WHERE status = 'EM_ANDAMENTO'
            LIMIT 1
        `);


        // ========================================================
        // NENHUMA EQUIPE ATIVA
        // ========================================================

        if (resultadoEquipe.rows.length === 0) {

            return res.status(404).json({
                sucesso: false,
                mensagem: "Não existe equipe em andamento."
            });

        }


        const equipe = resultadoEquipe.rows[0];


        // ========================================================
        // VERIFICAR TEMPO
        // ========================================================

        const entrada = new Date(equipe.entrada_em);
        const agora = new Date();

        const tempoDecorrido =
            agora.getTime() - entrada.getTime();

        const DEZ_MINUTOS = 10 * 60 * 1000;


        if (tempoDecorrido >= DEZ_MINUTOS) {

            await client.query(`
                UPDATE equipes
                SET status = 'EXPIRADO'
                WHERE id = $1
                  AND status = 'EM_ANDAMENTO'
            `, [equipe.id]);


            return res.status(410).json({
                sucesso: false,
                mensagem: "O tempo da equipe expirou.",
                status: "EXPIRADO"
            });

        }


        // ========================================================
        // VERIFICAR TERMINAIS
        // ========================================================

        if (!equipe.terminal_1_finalizado) {

            return res.status(400).json({
                correto: false,
                status: "EM_ANDAMENTO",
                mensagem: "O Terminal 1 ainda não foi concluído."
            });

        }


        if (!equipe.terminal_2_finalizado) {

            return res.status(400).json({
                correto: false,
                status: "EM_ANDAMENTO",
                mensagem: "O Terminal 2 ainda não foi concluído."
            });

        }


        if (!equipe.terminal_3_finalizado) {

            return res.status(400).json({
                correto: false,
                status: "EM_ANDAMENTO",
                mensagem: "O Terminal 3 ainda não foi concluído."
            });

        }


        // ========================================================
        // VERIFICAR CÓDIGO
        // ========================================================

        if (codigoRecebido !== equipe.codigo_cor.toUpperCase()) {

            return res.status(200).json({
                correto: false,
                status: "EM_ANDAMENTO"
            });

        }


        // ========================================================
        // FINALIZAR EQUIPE
        // ========================================================

        await client.query("BEGIN");


        const resultadoFinalizacao = await client.query(`
            UPDATE equipes
            SET
                status = 'FINALIZADO',
                finalizada_em = CURRENT_TIMESTAMP
            WHERE id = $1
              AND status = 'EM_ANDAMENTO'
            RETURNING
                id,
                status,
                entrada_em,
                finalizada_em
        `, [equipe.id]);


        if (resultadoFinalizacao.rows.length === 0) {

            await client.query("ROLLBACK");

            return res.status(409).json({
                sucesso: false,
                mensagem: "A equipe não está mais em andamento."
            });

        }


        await client.query("COMMIT");


        // ========================================================
        // RESPOSTA
        // ========================================================

        return res.status(200).json({
            correto: true,
            status: "FINALIZADO"
        });


    } catch (erro) {

        await client.query("ROLLBACK");

        console.error("Erro ao validar código:", erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno do servidor."
        });

    } finally {

        client.release();

    }

});

// ============================================================
// GET /terminal/ranking
// ============================================================

router.get("/ranking", async (req, res) => {

    try {

        const resultado = await pool.query(`
            SELECT
                nome,
                EXTRACT(
                    EPOCH FROM (finalizada_em - entrada_em)
                ) AS tempo
            FROM equipes
            WHERE status = 'FINALIZADO'
            ORDER BY
                (finalizada_em - entrada_em) ASC
        `);


        // ========================================================
        // MONTAR RANKING
        // ========================================================

        const ranking = resultado.rows.map((equipe, index) => {

            return {
                posicao: index + 1,
                nome: equipe.nome,
                tempo: Math.floor(Number(equipe.tempo))
            };

        });


        // ========================================================
        // RESPOSTA
        // ========================================================

        return res.status(200).json({
            ranking
        });


    } catch (erro) {

        console.error("Erro ao buscar ranking:", erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno do servidor."
        });

    }

});

// ============================================================
// POST /terminal/liberar
// ============================================================

router.post("/liberar", async (req, res) => {

    try {

        const { senha } = req.body;


        // ========================================================
        // VALIDAR SENHA
        // ========================================================

        if (!senha) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "A senha é obrigatória."
            });

        }


        // ========================================================
        // VERIFICAR SENHA ADMINISTRATIVA
        // ========================================================

        if (senha !== process.env.SENHA_ADMIN) {

            return res.status(401).json({
                sucesso: false,
                mensagem: "Senha administrativa inválida."
            });

        }


        // ========================================================
        // VERIFICAR SE EXISTE EQUIPE EM ANDAMENTO
        // ========================================================

        const resultado = await pool.query(`
            SELECT id
            FROM equipes
            WHERE status = 'EM_ANDAMENTO'
            LIMIT 1
        `);


        if (resultado.rows.length > 0) {

            return res.status(409).json({
                sucesso: false,
                mensagem: "Existe uma equipe em andamento. A sala ainda está ocupada."
            });

        }


        // ========================================================
        // SALA LIBERADA
        // ========================================================

        return res.status(200).json({
            sucesso: true,
            mensagem: "Sala liberada para uma nova equipe."
        });


    } catch (erro) {

        console.error("Erro ao liberar sala:", erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno do servidor."
        });

    }

});

module.exports = router;