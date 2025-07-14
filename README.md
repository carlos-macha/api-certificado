# Emissão de Certificado Digital com Node.js e API Soluti

## Requisitos

- Node.js instalado
- OpenSSL instalado no computador
Baixe o OpenSSL para Windows: https://slproweb.com/products/Win32OpenSSL.html

Fluxo de Emissão
1. Validar os dados

2. Emitir o certificado

3. Validar novamente para obter digitaltermHash

4. Recuperar o certificado

Como Executar

  node src/validar.js

  node src/emitir.js

  node src/recuperar.js

Como funciona
- Solicitação: é o nome de usuário fornecido pela Soluti
- Senha de emissão: é a senha criada pelo cliente na hora da compra do certificado
- digitaltermHash, exigido na rota de emissão, é obtido na resposta da rota de validação

Finalizando a emissão
Após executar o recuperar.js, será gerado o arquivo certificado_final.pem
Este arquivo deve ser armazenado junto com a chave privada gerada na emissão (chavePrivada.pem)

Convertendo para .pfx
Execute o comando abaixo:
openssl pkcs12 -export -inkey chavePrivada.pem -in certificado_final.pem -out certificado_final.pfx

O arquivo .pfx gerado é o certificado completo, pronto para ser instalado no computador do cliente
