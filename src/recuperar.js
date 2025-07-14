const fs = require('fs');
const { execSync } = require('child_process');
const CryptoJS = require('crypto-js');

const solicitacao = "712E25070490A85C 00014035873969";
const senhaEmissao = "99625746Car$";
const baseUrl = 'https://artecnosign.acsoluti.com.br';

const generateValidNonce = () => {
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  const timestampPart = Math.floor(Date.now() / 1000);
  const nonce = randomPart.toString() + timestampPart.toString();

  if (nonce.length !== 14) {
    console.error("ERRO: Nonce inválido gerado:", nonce);
    throw new Error(`Nonce deve ter 14 dígitos! Gerado: ${nonce} (${nonce.length} dígitos)`);
  }

  return nonce;
};

async function recuperarCertificado(nonce1) {
  const mensagem = JSON.stringify({ "mensagem": solicitacao });
  const hkey = CryptoJS.SHA256(nonce1 + senhaEmissao).toString();
  const hmac = CryptoJS.SHA256(hkey + mensagem).toString();

  const form = new FormData();
  form.append('solicitacao', solicitacao);
  form.append('mensagem', mensagem);
  form.append('hmac', hmac);
  form.append('nonce1', nonce1);

  const res = await fetch(`${baseUrl}/webservice/recuperar-certificado`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
    body: form,
  });

  const responseText = await res.text();
  console.log('RESPOSTA FINAL:', responseText);

  const body = JSON.parse(responseText);
  const pkcs7Content = body.mensagem.data;

  return pkcs7Content;
}

function gerarCertificadoFinal(pkcs7Content) {
  fs.writeFileSync('certificado.p7b', pkcs7Content);
  console.log('certificado.p7b salvo.');

  try {
    execSync('openssl pkcs7 -print_certs -in certificado.p7b -out certificado_final.pem');
    console.log('certificado_final.pem gerado com sucesso!');
  } catch (err) {
    console.error('Erro ao converter para PEM:', err.message);
    process.exit(1);
  }
}

(async () => {
  try {
    const nonce1 = generateValidNonce();
    const pkcs7Content = await recuperarCertificado(nonce1);
    gerarCertificadoFinal(pkcs7Content);
  } catch (error) {
    console.error('Erro no processo:', error);
  }
})();