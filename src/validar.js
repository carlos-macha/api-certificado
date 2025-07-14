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

async function validarCertificado(nonce1) {
    const mensagem = JSON.stringify({ "mensagem": solicitacao });
    const hkey = CryptoJS.SHA256(nonce1 + senhaEmissao).toString();
    const hmac = CryptoJS.SHA256(hkey + mensagem).toString();

    const form = new FormData();
    form.append('solicitacao', solicitacao);
    form.append('mensagem', mensagem);
    form.append('hmac', hmac);
    form.append('nonce1', nonce1);

    const res = await fetch(`${baseUrl}/webservice/valida-dados-emissao`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
        },
        body: form,
    });

    const body = await res.text();
    console.log('RESPOSTA FINAL:', body);
}

(async () => {
    try {
        const nonce1 = generateValidNonce();
        await validarCertificado(nonce1);
    } catch (error) {
        console.error('Erro no processo:', error);
    }
})();