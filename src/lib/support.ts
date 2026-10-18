// Publish only owner-verified destinations and consented public pseudonyms.
export const support = {
	paypal: 'https://www.paypal.com/qrcodes/managed/f14d5dd1-bd60-4a46-981e-564ac4a9e3ec?utm_source=consweb_more',
	paypalQrAsset: '/assets/support/paypal-qr.png',
	contact: '',
	crypto: { address: '0x6bb68E9013eF885D4DC94e151f5249A4d0de3186', network: 'Ethereum Mainnet', iconAsset: '/assets/support/ethereum.png' },
	bank: { beneficiary: '', iban: '', qrAsset: '' },
	contributors: [] as string[]
}
