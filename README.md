# API — Casa Aberta Senac

API responsável pelo gerenciamento do Escape Room Casa Aberta
e pelo ranking do Genius Competitivo.

## Tecnologias

- Node.js
- Express
- PostgreSQL
- Supabase

## Funcionalidades

### Escape Room

- Criação de equipes
- Controle de sessão
- Controle de tempo
- Distribuição dos códigos dos terminais
- Conclusão dos terminais
- Validação do código final
- Ranking das equipes
- Liberação administrativa

### Genius Competitivo

- Registro de partidas
- Ranking competitivo

## Instalação

Clone o repositório:

git clone URL_DO_REPOSITORIO

Entre na pasta:

cd api

Instale as dependências:

npm install

Crie um arquivo `.env` baseado no `.env.example`.

Depois execute:

npm run dev

A API estará disponível em:

http://localhost:3000

# Endpoints

## Terminal

### POST /terminal/iniciar

Inicia uma nova equipe.

#### Body

```json
{
  "nome": "Equipe Alpha",
  "codigoCor": "FF5733"
}

Resonse

{
  "sucesso": true,
  "equipeId": 15,
  "status": "EM_ANDAMENTO"
}
