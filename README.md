# FlyGuide

FlyGuide é uma plataforma web para planejamento de viagens. O sistema permite criar, editar, organizar, publicar e acompanhar roteiros personalizados com sugestões de atividades, mapas, avaliações e recursos de apoio ao viajante.

## Acesso ao sistema

O acesso oficial ao FlyGuide deve ser feito pela tela de login:

https://tcc-2025-1-e-2-flyguide.vercel.app/pages/login.html

## Sobre o projeto

O FlyGuide ajuda usuários a planejarem viagens de forma mais organizada. A pessoa informa o local principal, a quantidade de dias, o tipo de viagem e, se houver, os períodos de check-in e check-out.

A partir dessas informações, o sistema gera uma sugestão inicial de roteiro e permite que o usuário revise, edite, adicione ou remova atividades antes de salvar o roteiro.

Este projeto foi desenvolvido como Trabalho de Conclusão de Curso (TCC) do Serviço Nacional de Aprendizagem Comercial (SENAC), no curso de Bacharelado em Sistemas de Informação.

## Funcionalidades

- Cadastro e login de usuários.
- Autenticação com JWT.
- Criação de roteiros por destino, duração e tipo de viagem.
- Definição de períodos de check-in e check-out.
- Geração de sugestões de atividades por dia e período.
- Edição, adição, remoção e reorganização de locais do roteiro.
- Busca e recomendações de locais com Google Places.
- Visualização dos locais no mapa.
- Feed de roteiros públicos.
- Salvamento, publicação e clonagem de roteiros.
- Avaliações, comentários e curtidas.
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
- Google Maps JavaScript API
- Google Places API

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

- Google Places API para busca e detalhes de locais.
- Anthropic API para geração de roteiros.
- OpenAI API para moderação de texto.
- Brevo/Gmail SMTP para envio de e-mails.
- ViaCEP para apoio no cadastro de usuários.

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
+-- LICENSE
+-- README.md
```

## Pré-requisitos e instalação

### Pré-requisitos

- Java 17.
- Maven ou Maven Wrapper.
- MySQL.
- Navegador moderno.
- Chaves de APIs externas para testar todos os recursos integrados.

### Baixar o projeto

```bash
git clone https://github.com/TCC-CAS/tcc-2025-1-e-2-flyguide.git
cd tcc-2025-1-e-2-flyguide
```

### Configurar o back-end

1. Acesse a pasta do back-end:

```bash
cd "FlyGuide/Back End"
```

2. Configure um banco MySQL local.

Por padrão, o perfil de teste usa:

```text
Banco: BD_FLY
Host: 127.0.0.1
Porta: 3306
Usuário: root
Senha: 12345
```

Esses valores podem ser alterados em:

```text
FlyGuide/Back End/src/main/resources/application-test.properties
```

3. Configure as variáveis de ambiente necessárias para recursos externos, quando aplicável.

Existe um modelo em:

```text
FlyGuide/Back End/.env.example
```

4. Execute a aplicação:

```bash
./mvnw spring-boot:run
```

No Windows:

```powershell
.\mvnw.cmd spring-boot:run
```

Por padrão, a API local sobe em:

```text
http://localhost:8080
```

### Executar o front-end

O front-end é estático. Para executar localmente, acesse a pasta:

```bash
cd "FlyGuide/Front end"
```

Em seguida, sirva os arquivos com um servidor estático:

```bash
python -m http.server 5500
```

Depois acesse no navegador:

```text
http://localhost:5500
```

Também é possível abrir o arquivo `index.html` diretamente em um navegador moderno.

### Deployment

O ambiente publicado deve ser acessado pela tela de login informada na seção "Acesso ao sistema". O front-end está hospedado na Vercel e consome a API publicada do back-end, que está hospedado junto ao banco de dados no Railway.

## Exemplos de uso

### Criar um roteiro

1. Acesse a tela de login e entre com um usuário cadastrado.
2. Abra a opção "Gerar Novo Roteiro".
3. Informe o local principal, a quantidade de dias, o tipo da viagem e os períodos de check-in/check-out, caso existam.
4. Clique em "Gerar Roteiro".
5. Revise as sugestões criadas, ajuste título, descrição, imagem, visibilidade e atividades.
6. Salve o roteiro para que ele apareça em "Meus Roteiros".

### Editar atividades do roteiro

1. Abra um roteiro salvo.
2. Acesse a edição dos locais/atividades.
3. Adicione, remova ou reorganize os locais por dia e período.
4. Salve as alterações para atualizar o roteiro.

### Acompanhar e compartilhar

1. Em "Meus Roteiros", o usuário pode visualizar, editar, iniciar ou exportar o roteiro em PDF.
2. Roteiros públicos podem aparecer no feed.
3. Outros usuários podem avaliar, comentar e clonar roteiros publicados.

Para a entrega final, recomenda-se complementar esta seção com prints das telas de login, criação de roteiro, edição de atividades, feed e "Meus Roteiros".

## Fluxo principal

1. O usuário cria uma conta ou faz login.
2. O usuário informa o local principal, a quantidade de dias, o tipo de viagem e os períodos de check-in/check-out.
3. O sistema gera uma proposta inicial de roteiro.
4. O usuário revisa título, descrição, imagem, visibilidade e locais.
5. O usuário adiciona, remove ou reorganiza atividades.
6. O roteiro é salvo em "Meus Roteiros".
7. O usuário pode publicar, editar, iniciar, avaliar ou exportar o roteiro.

## Contribuindo

Como este é um projeto acadêmico de TCC, as contribuições devem ser organizadas entre os integrantes do grupo.

Fluxo recomendado:

1. Criar uma branch para cada ajuste ou funcionalidade.
2. Realizar commits com mensagens claras sobre a alteração.
3. Não versionar senhas, tokens, chaves de API ou arquivos `.env`.
4. Testar os fluxos principais antes de enviar alterações para a branch principal.
5. Abrir uma solicitação de revisão ou validar o código com outro integrante antes do merge.

## Status do projeto

Projeto acadêmico concluído para fins de Trabalho de Conclusão de Curso.

Serviço Nacional de Aprendizagem Comercial (SENAC), curso de Bacharelado em Sistemas de Informação.

## Integrantes

| RA | Nome |
| --- | --- |
| 1142522463 | Kauã Silva Dias |
| 1142508213 | Igor Gomes da Silva |
| 1142527562 | Guilherme Cordeiro Rodrigues |

## Licença

Este projeto está licenciado sob a MIT License, conforme indicado no arquivo `LICENSE` localizado na raiz do repositório.
