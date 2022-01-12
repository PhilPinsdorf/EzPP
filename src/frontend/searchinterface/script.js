const apiBaseUrl = 'https://ezpp.herokuapp.com/api/v1/';

var fac = new FastAverageColor();

//Html-Variables
var searchButton = document.querySelector('#searchBtn');
var text = document.querySelector('#trackName');
var quantity = document.querySelector('.quantity');
var div = document.querySelector('.searchresults');
var container = document.querySelector('.resultcontainer');
var template = document.querySelector('#template');
var audioplayer = document.querySelector('#previewaudio');
var playbuttons = [];

div.style.display = 'none';

//Add Search Button Functionality
searchButton.addEventListener('click', () => {
	fetch(apiBaseUrl + 'getTracksBySearch?track=' + encodeURIComponent(text.value) + '&limit=' + encodeURIComponent(quantity))
		.then((response) => response.json())
		.then((data) => {
			div.innerHTML = '';
			div.style.display = 'inline-block';
			container.style.display = 'inline-block';

			for (let i = 0; i < data.length; i++) {
				(function (cntr) {
					var newDiv = document.createElement('div');
					newDiv.classList.add('resultbox');
					newDiv.innerHTML = template.innerHTML;

					var cover = newDiv.querySelector('.cover > img');
					cover.src = data[cntr].image;
					var trackname = newDiv.querySelector('.infotext > h3');
					trackname.innerHTML = data[cntr].name;
					var artist = newDiv.querySelector('.infotext > h4');
					artist.innerHTML = data[cntr].artists;

					fac.getColorAsync(data[cntr].image, { algorithm: 'dominant' })
						.then((color) => {
							var bgImage = newDiv.querySelector('.infobg');
							bgImage.style.backgroundColor = color.rgba;

							var info = newDiv.querySelector('.infotext');
							info.style.color = color.isDark ? 'white' : 'black';
						})
						.catch((e) => {
							console.error(e);
						});

					var playButton = newDiv.querySelector('.playbutton > button');
					playButton.value = data[cntr].preview;
					if (data[cntr].preview === null) {
						playButton.disabled = true;
						playButton.classList.remove('off');
						playButton.classList.add('nopreview');
					} else {
						playbuttons.push(playButton);
					}

					playButton.addEventListener('click', () => {
						if (playButton.classList.contains('off')) {
							for (var j = 0; j < playbuttons.length; j++) {
								playbuttons[j].classList.remove('on');
								playbuttons[j].classList.add('off');
							}

							playButton.classList.remove('off');
							playButton.classList.add('on');

							audioplayer.src = playButton.value;
						} else if (playButton.classList.contains('on')) {
							playButton.classList.remove('on');
							playButton.classList.add('off');
							audioplayer.src = '';
						}
					});

					var addButton = newDiv.querySelector('.addbutton > button');
					addButton.value = data[cntr].id;
					addButton.addEventListener('click', () => {
						addButton.classList.remove('unadded');
						addButton.classList.add('added');

						var params = new URLSearchParams(window.location.search);

						console.log(params.get('id'));

						fetch(
							apiBaseUrl +
								'addsong?user=' +
								encodeURIComponent(params.get('id')) +
								'&song=' +
								encodeURIComponent(addButton.value) +
								'&key=' +
								encodeURIComponent(params.get('key'))
						);
					});

					audioplayer.addEventListener('ended', function () {
						for (var j = 0; j < playbuttons.length; j++) {
							playbuttons[j].classList.remove('on');
							playbuttons[j].classList.add('off');
						}
					});

					div.appendChild(newDiv);
				})(i);
			}
		});
});

// Audio Volume Slider
var volume = document.querySelector('.volumecontrol');
audioplayer.volume = volume.value / 100;
volume.addEventListener('input', function (e) {
	audioplayer.volume = e.currentTarget.value / 100;
});
