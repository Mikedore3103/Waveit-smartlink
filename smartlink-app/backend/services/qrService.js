const QRCode = require('qrcode');

const generateQrDataUrl = async (value) => {
  return QRCode.toDataURL(String(value || ''), {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
  });
};

module.exports = {
  generateQrDataUrl,
};
