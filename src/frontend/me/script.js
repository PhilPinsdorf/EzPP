const apiBaseUrl = 'https://ezpp.herokuapp.com/api/v1/';

var linkbutton = document.querySelector('.copybutton');
var actbutton = document.querySelector('.actbutton');

fetch(apiBaseUrl + 'getenabled')
	.then((response) => response.json())
	.then((data) => {
		if (data.enabled) {
			actbutton.classList.add('active');
			actbutton.innerHTML = 'Ja!';
		} else {
			actbutton.classList.add('deactive');
			actbutton.innerHTML = 'Nein!';
		}
		actbutton.value = data.enabled;
	});

generate_all();

function generate_new_key() {
	fetch(apiBaseUrl + 'generate_key')
		.then((response) => response.text())
		.then((data) => {
			generate_all();
		});
}

function generate_all() {
	fetch(apiBaseUrl + 'getlink')
		.then((response) => response.text())
		.then((data) => {
			linkbutton.value = data;

			document.querySelector('.qrcode').innerHTML = '';

			new QRCode(document.querySelector('.qrcode'), {
				text: data,
				width: 750,
				height: 750,
				colorDark: '#000000',
				colorLight: '#ffffff',
				correctLevel: QRCode.CorrectLevel.H,
			});
		});

	fetch(apiBaseUrl + 'getname')
		.then((response) => response.text())
		.then((data) => {
			var nametitle = document.querySelector('.nametitle');
			nametitle.innerHTML = 'Hallo, ' + data + '!';

			var printtitle = document.querySelector('.printtitle > u');
			printtitle.innerHTML = 'Füge Songs zu ' + data + "'s Playlist hinzu!";
		});
}

function save_activate() {
	fetch(apiBaseUrl + 'setenabled?state=' + (actbutton.value === 'true' ? 'false' : 'true'))
		.then((response) => response.text())
		.then((data) => {
			actbutton.value === 'true' ? (actbutton.value = 'false') : (actbutton.value = 'true');
			if (actbutton.value === 'true') {
				actbutton.classList.remove('deactive');
				actbutton.classList.add('active');
				actbutton.innerHTML = 'Ja!';
			} else {
				actbutton.classList.remove('active');
				actbutton.classList.add('deactive');
				actbutton.innerHTML = 'Nein!';
			}
			console.log(actbutton.classList);
		});
}

function copy_content() {
	var input = document.createElement('input');
	input.setAttribute('value', linkbutton.value);
	document.body.appendChild(input);
	input.select();
	document.execCommand('copy');
	document.body.removeChild(input);
}

function print_content() {
	window.print();
}
