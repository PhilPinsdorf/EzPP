var div = document.querySelector('#errormessage');
const urlParams = new URLSearchParams(window.location.search);
const message = urlParams.get('text');
div.innerHTML = message;
