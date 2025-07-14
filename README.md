Para rodar esses códigos é preciso ter o OpenSSL instalado no computador: https://slproweb.com/products/Win32OpenSSL.html

fluxo de emissão:
  1.validar.js
  2.emitir.js
  3.validar.js
  4.recuperar.js

como executar o código:
  node src/validar.js
  node src/emitir.js
  node src/recuperar.js

O código digitaltermHash, exigido na rota de emissão, é obtido na resposta da rota de validação.

Solicitação é o nome de usuário. 
A senha de emissão, é a senha criada pelo cliente na hóra da compra do certificado.

Após executar a rota para recuperar o certificado, ela vai retornar o arquivo certificado_final.pem,
você deve armazenar ele em um diretório junto com o arquivo  chavePrivado.pem, que foi gerado na hóra da emissão.
Após isso você deve rodar o comando abaixo para concatenar eles em um arquivo .pfx,
e por fim executar o arquivo .pfx no computador que deseja instalar o certificado.

Comando: openssl pkcs12 -export -inkey chavePrivada.pem -in certificado_final.pem -out certificado_final.pfx
