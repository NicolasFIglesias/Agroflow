// Script único para criar a conta superdev
// Uso: node src/scripts/criar-dev.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db     = require('../db');

const EMAIL = 'dev@agriflow.app';
const SENHA = 'Agriflow@Dev2025';

async function main() {
  try {
    // Verificar se já existe
    const { rows } = await db.query(`SELECT id FROM usuarios WHERE email=$1`, [EMAIL]);
    if (rows.length) {
      console.log(`Conta dev já existe (id: ${rows[0].id}). Para redefinir a senha use a tela de login.`);
      process.exit(0);
    }

    // Criar empresa dev se não existir
    let empresaId;
    const { rows: emp } = await db.query(`SELECT id FROM empresas WHERE nome='AgriFlow Dev'`);
    if (emp.length) {
      empresaId = emp[0].id;
    } else {
      const { rows: [e] } = await db.query(
        `INSERT INTO empresas (nome) VALUES ('AgriFlow Dev') RETURNING id`
      );
      empresaId = e.id;
    }

    // Criar usuário superdev
    const hash = await bcrypt.hash(SENHA, 10);
    const { rows: [u] } = await db.query(
      `INSERT INTO usuarios (empresa_id, nome, email, senha_hash, cargo, role, ativo)
       VALUES ($1, 'Dev Admin', $2, $3, 'Desenvolvedor', 'superdev', true)
       RETURNING id, email, role`,
      [empresaId, EMAIL, hash]
    );

    console.log('✅ Conta dev criada com sucesso!');
    console.log(`   Email: ${u.email}`);
    console.log(`   Senha: ${SENHA}`);
    console.log(`   Role:  ${u.role}`);
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    process.exit(0);
  }
}

main();
