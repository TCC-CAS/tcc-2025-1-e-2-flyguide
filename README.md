# FlyGuide

FlyGuide é uma plataforma web para criação, edição, compartilhamento e acompanhamento de roteiros de viagem.

## Acesso ao sistema

O acesso ao FlyGuide deve ser feito pela tela de login:

https://tcc-2025-1-e-2-flyguide.vercel.app/pages/login.html

## Sobre o projeto

O FlyGuide ajuda usuários a planejarem viagens de forma mais organizada. A pessoa informa um local principal, a quantidade de dias, o tipo de viagem e, se houver, os períodos de check-in e check-out.

A partir dessas informações, o sistema gera uma sugestão inicial de roteiro e permite que o usuário revise, edite, adicione ou remova atividades antes de salvar o roteiro.

Este projeto foi desenvolvido como Trabalho de Conclusão de Curso (TCC) do Serviço Nacional de Aprendizagem (SENAC), no curso de Bacharelado em Sistemas de Informação.

## Funcionalidades

- Cadastro e login de usuários.
- Autenticação com JWT.
- Criação de roteiros por destino, duração e tipo de viagem.
- Sugestões de atividades por dia e período.
- Edição de locais do roteiro.
- Busca e recomendações de locais com Google Places.
- Visualização dos locais no mapa.
- Feed de roteiros públicos.
- Salvamento e clonagem de roteiros.
- Avaliações e comentários.
- Curtidas em comentários.
- Planos premium e controle de limite para usuários gratuitos.
- Exportação de roteiro em PDF.
- Modo escuro.
- Envio de e-mails transacionais.

## Tecnologias

### Front-end

- HTML5
- CSS3
- JavaScript
- Bootstrap
- Bootstrap Icons
- Google Maps JavaScript API / Places

### Back-end

- Java 17
- Spring Boot
- Spring Web MVC
- Spring Data JPA
- Spring Security
- JWT
- Maven
- MySQL
- H2 para testes
- iText para geração de PDF
- JaCoCo para cobertura de testes

### Integrações

- Google Places API
- OpenAI API para moderação de texto
- Anthropic API para geração de roteiros
- Brevo/Gmail SMTP para envio de e-mails

## Estrutura do repositório

```text
.
+-- FlyGuide/
|   +-- Back End/
|   |   +-- src/main/java/com/TCC/FlyGuide/
|   |   |   +-- DTO/
|   |   |   +-- entities/
|   |   |   +-- repositories/
|   |   |   +-- resources/
|   |   |   +-- services/
|   |   +-- src/main/resources/
|   |   +-- pom.xml
|   |   +-- Dockerfile
|   +-- Front end/
|       +-- assets/
|       |   +-- css/
|       |   +-- img/
|       |   +-- js/
|       +-- pages/
|       +-- index.html
+-- README.md
```

## Fluxo principal

1. O usuário cria uma conta ou faz login.
2. O usuário informa o local principal, a quantidade de dias, o tipo de viagem e os períodos de check-in/check-out.
3. O sistema gera uma proposta inicial de roteiro.
4. O usuário revisa título, descrição, imagem, visibilidade e locais.
5. O usuário adiciona, remove ou reorganiza atividades.
6. O roteiro é salvo em "Meus Roteiros".
7. O usuário pode publicar, editar, iniciar, avaliar ou exportar o roteiro.

## Status do projeto

Projeto acadêmico concluído para fins de Trabalho de Conclusão de Curso.

Serviço Nacional de Aprendizagem Comercial (SENAC), curso de Bacharelado em Sistemas de Informação.

## Integrantes

| RA | Nome |
| --- | --- |
| 1142522463 | Kauã Silva Dias |
| 1142508213 | Igor Gomes da Silva |
| 1142527562 | Guilherme Cordeiro Rodrigues |
