# Relatório de Projeto de Extensão: Nexus IT

## 1. Resumo do Projeto
O presente relatório descreve o desenvolvimento e a implementação do "Nexus IT", um sistema web projetado para centralizar e otimizar as operações diárias de um departamento de Tecnologia da Informação. O software soluciona problemas clássicos de dispersão de informações ao unificar a gestão de tarefas (helpdesk e projetos), o controle de inventário de hardware e um acervo colaborativo de conhecimento. O sistema já se encontra em ambiente de produção, sendo ativamente utilizado por uma empresa parceira, validando seu impacto prático e cumprindo o papel social e prático do projeto de extensão universitária.

## 2. Introdução e Justificativa
Departamentos de TI lidam diariamente com um alto volume de demandas simultâneas, que vão desde a manutenção de hardware até a resolução de chamados de software e gestão de licenças. Historicamente, essas informações ficam fragmentadas em planilhas, e-mails e anotações isoladas, resultando em perda de produtividade.

O Nexus IT foi idealizado para ser a "fonte única da verdade" (Single Source of Truth) do setor. A justificativa do projeto baseia-se na necessidade de trazer metodologias ágeis de gestão e organização de ativos para a realidade corporativa, reduzindo o tempo de resposta a incidentes e evitando perdas financeiras com equipamentos mal gerenciados.

## 3. Objetivos

**Objetivo Geral:** Desenvolver e implementar uma plataforma web escalável para a gestão integral das atividades de um departamento de TI, unindo fluxo de trabalho, controle de patrimônio e base de conhecimento.

**Objetivos Específicos:**
- Implementar um módulo de Gestão de Tarefas baseado na metodologia Kanban, permitindo o acompanhamento visual de prazos e pendências.
- Criar um Gerenciador de Inventário robusto para rastreamento do ciclo de vida de equipamentos (notebooks, smartphones, periféricos), identificando responsáveis e status operacional.
- Desenvolver um Acervo de Conteúdo centralizado para armazenamento seguro de trechos de código (snippets), links úteis, documentações e extensões.

## 4. Metodologia de Desenvolvimento
O projeto foi desenvolvido sob a ótica das metodologias ágeis modernas, empregando o conceito de AI-Assisted Development (Desenvolvimento Assistido por Inteligência Artificial), também conhecido na comunidade técnica como "Vibecoding".

A metodologia consistiu em:
- **Prototipação Rápida:** Geração de lógicas e estruturas iniciais com o auxílio de IA.
- **Aprofundamento e Refatoração:** Revisão humana rigorosa (Human-in-the-loop), aplicando tipagem forte, padrões de projeto, segurança de dados e boas práticas de engenharia de software para garantir a escalabilidade do código.
- **Integração Contínua (CI/CD):** Deploy automatizado a cada novo recurso aprovado, garantindo entregas incrementais e validação imediata pelos usuários finais.

## 5. Arquitetura e Tecnologias Utilizadas
A arquitetura do sistema foi desenhada para garantir alta performance, segurança e manutenção facilitada, utilizando uma stack tecnológica moderna (Ecossistema JavaScript/TypeScript):

- **Linguagem:** TypeScript, garantindo segurança de tipos (Type Safety) e mitigando erros em tempo de execução.
- **Frontend (Interface):** React estruturado com a ferramenta de build Vite, garantindo extrema velocidade no ambiente de desenvolvimento e otimização no carregamento final (bundle).
- **Estilização:** Tailwind CSS, framework utilitário que permitiu a criação de uma interface responsiva, acessível e consistente.
- **Backend as a Service (BaaS):** Supabase, escolhido por ser uma alternativa Open Source robusta, fornecendo banco de dados relacional (PostgreSQL), autenticação de usuários e atualização de dados em tempo real (Realtime subscriptions).
- **Hospedagem / Deploy:** Vercel, provendo entrega contínua (CI/CD) com borda global (Edge Network), resultando em baixa latência e alta disponibilidade.

## 6. Resultados Alcançados e Impacto
O projeto ultrapassou a fase acadêmica e encontra-se em ambiente de produção (hospedado na Vercel) com código versionado no GitHub. O sistema já foi adotado por uma empresa para gerenciar o seu setor de TI.

**Impactos diretos observados:**
- **Transparência Operacional:** A adoção do Kanban reduziu o acúmulo de tarefas esquecidas.
- **Controle de Ativos:** O inventário digitalizado eliminou as inconsistências sobre a localização e o estado de conservação de hardwares valiosos.
- **Produtividade Compartilhada:** O acervo de códigos e links acelerou o processo de onboarding de novos membros na equipe técnica.

## 7. Conclusão
O desenvolvimento do Nexus IT atendeu plenamente aos requisitos de um projeto de extensão ao conectar o conhecimento acadêmico de engenharia de software com uma necessidade real do mercado corporativo. A utilização de TypeScript e ferramentas modernas como Supabase provaram-se eficazes na construção de uma solução estável e escalável. A experiência de unir iteração assistida por IA com o aprofundamento técnico humano demonstrou ser um fluxo de trabalho altamente produtivo, preparando o projeto para futuras expansões e integrações.

## Para rodar o projeto:

**Pré-requisitos:**  Node.js


1. Instale as dependências pelo terminal:
   `npm install`
2. Defina a `VITE_SUPABASE_ANON_KEY` e `VITE_SUPABASE_URL`a no arquivo [.env.local](.env.local)
3. Rode o código localmente usando o terminal:
   `npm run dev`
