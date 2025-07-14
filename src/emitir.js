const forge = require('node-forge');
const crypto = require('crypto');
const fs = require('fs');
const { execSync } = require('child_process');
const FormData = require('form-data');
const fetch = require('node-fetch');

const baseUrl = 'https://artecnosign.acsoluti.com.br';
const solicitacao = '712E25070490A85C 00014035873969';
const senhaEmissao = '99625746Car$';
const urlEmissor = 'https://emissor.ca.inf.br/prod/Emissor.jar';

const generateValidNonce = () => {
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  const timestampPart = Math.floor(Date.now() / 1000);
  const nonce = randomPart.toString() + timestampPart.toString();
  if (nonce.length !== 14) throw new Error(`Nonce inválido: ${nonce}`);
  return nonce;
};

async function abrirSessao(nonce1) {
  const mensagemSessao = JSON.stringify({ session: '_Sinerg_HMAC_Session_Request_' });
  const hkeySessao = crypto.createHash('sha256').update(nonce1 + senhaEmissao).digest('hex');
  const hmacSessao = crypto.createHash('sha256').update(hkeySessao + mensagemSessao).digest('hex');

  const form = new FormData();
  form.append('solicitacao', solicitacao);
  form.append('mensagem', mensagemSessao);
  form.append('hmac', hmacSessao);
  form.append('nonce1', nonce1);

  const res = await fetch(`${baseUrl}/webservice/emitir-certificado`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: form,
  });

  const cookies = res.headers.get('set-cookie');
  const body = await res.json();
  const cookie = /PHPSESSID=([^;]+)/.exec(cookies)?.[1] || '';
  const nonce2 = body.nonce2;

  return { cookie, nonce2 };
}

function formatarCSR(pem) {
  const base64 = pem
    .replace(/-----BEGIN CERTIFICATE REQUEST-----/g, '')
    .replace(/-----END CERTIFICATE REQUEST-----/g, '')
    .replace(/\r?\n|\r/g, '')
    .trim();

  const linhas = base64.match(/.{1,64}/g).join('\n');
  return `-----BEGIN CERTIFICATE REQUEST-----\n${linhas}\n-----END CERTIFICATE REQUEST-----`;
}

function gerarChavesECsr() {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
  fs.writeFileSync('chavePrivada.pem', privateKeyPem);

  const csr = forge.pki.createCertificationRequest();
  csr.publicKey = keys.publicKey;
  csr.setSubject([{ name: 'commonName', value: '712E25070490A85C 00014035873969' }]);
  csr.sign(keys.privateKey, forge.md.sha256.create());

  const pemCsr = forge.pki.certificationRequestToPem(csr);
  const formatted = formatarCSR(pemCsr);

  console.log('CSR GERADO:\n' + formatted);
  return { csr: formatted, chavePrivadaPath: 'chavePrivada.pem' };
}

function assinarDigitalTerm(digitaltermHashHex, chavePrivadaPath) {
  fs.writeFileSync('digitalterm_signature.txt', Buffer.from(digitaltermHashHex, 'hex'));
  execSync(`openssl pkeyutl -sign -inkey ${chavePrivadaPath} -in digitalterm_signature.txt -out assinatura_pkcs1.der`);
  const assinaturaDer = fs.readFileSync('assinatura_pkcs1.der');
  const assinaturaBase64 = assinaturaDer.toString('base64');
  const assinaturaFormatada = assinaturaBase64.match(/.{1,64}/g).join('\n');

  fs.unlinkSync('digitalterm_signature.txt');
  fs.unlinkSync('assinatura_pkcs1.der');

  return `-----BEGIN PKCS1-----\n${assinaturaFormatada}\n-----END PKCS1-----`;
}

async function emitirCertificado(nonce1, nonce2, cookie, csr, digitalterm_signature) {
  const contador = 1;

  const mensagem = JSON.stringify({
    tipo: 'PKCS7',
    computador: 'Servidor de emissão A1',
    sistema_operacional: 'Linux Ubuntu S.O.',
    versao: 'Soluti AC v1.1.0',
    interfaces: [{
      nome: 'Realtek RLT8899 (Wlan0)',
      ip: '192.168.1.2',
      mac: '10-20-30-40-50-AB',
    }],
    csr,
    digitalterm_signature,
    url_emissor: urlEmissor,
  });

  const hkey = crypto.createHash('sha256').update(nonce1 + senhaEmissao + contador + nonce2).digest('hex');
  const hmac = crypto.createHash('sha256').update(hkey + mensagem).digest('hex');

  const form = new FormData();
  form.append('solicitacao', solicitacao);
  form.append('mensagem', mensagem);
  form.append('hmac', hmac);
  form.append('nonce1', nonce1);

  const res = await fetch(`${baseUrl}/webservice/emitir-certificado`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Cookie: `PHPSESSID=${cookie}`,
    },
    body: form,
  });

  const body = await res.text();
  console.log('RESPOSTA FINAL:', body);
}

(async () => {
  try {
    const nonce1 = generateValidNonce();
    const { cookie, nonce2 } = await abrirSessao(nonce1);
    const { csr, chavePrivadaPath } = gerarChavesECsr();

    const digitaltermHash = '3031300d0609608648016503040201050004201fc7179c4564ddf18d954ec1cbfd9ff4a39437aa4f430e9231e143d1e799827e';
    const digitalterm_signature = assinarDigitalTerm(digitaltermHash, chavePrivadaPath);

    await emitirCertificado(nonce1, nonce2, cookie, csr, digitalterm_signature);
  } catch (error) {
    console.error('Erro no processo:', error);
  }
})();
