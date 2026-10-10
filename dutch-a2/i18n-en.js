'use strict';
/* Ingilizce icerik parcalarini tek nesnede birlestirir */
const I18N_EN = Object.assign({},
  typeof EN_VOCAB !== 'undefined' ? EN_VOCAB : {},
  typeof EN_CONTENT !== 'undefined' ? EN_CONTENT : {});
