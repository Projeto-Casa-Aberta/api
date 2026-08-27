// ============================================================
// HELPER ADMINISTRATIVO
// Usado por qualquer rota que exija senha admin + auditoria.
// ============================================================

// ============================================================
// VERIFICAR SENHA ADMINISTRATIVA
// ============================================================

function senhaAdminValida(senha) {

    return (
        !!senha &&
        senha === process.env.SENHA_ADMIN
    );

}


// ============================================================
// REGISTRAR AUDITORIA
// Recebe um client (dentro de uma transação já aberta) ou o
// pool diretamente, quando a ação é uma única query.
// ============================================================

async function registrarAuditoria(clientOuPool, {
    administrador,
    acao,
    configuracao = null,
    valorAnterior = null,
    valorNovo = null,
    resultado
}) {

    await clientOuPool.query(`
        INSERT INTO auditoria_admin (
            administrador,
            acao,
            configuracao,
            valor_anterior,
            valor_novo,
            resultado
        )
        VALUES ($1, $2, $3, $4, $5, $6)
    `, [
        administrador,
        acao,
        configuracao,
        valorAnterior !== null ? String(valorAnterior) : null,
        valorNovo !== null ? String(valorNovo) : null,
        resultado
    ]);

}


module.exports = {
    senhaAdminValida,
    registrarAuditoria
};