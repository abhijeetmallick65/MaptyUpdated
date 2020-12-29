'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const cross = document.querySelector('.fa-times');
const reset = document.querySelector('.logo');
// Global Variables
// let map, mapEvent;

// Class Workout
class Workout {
  // Public Class Fields
  date = new Date();
  id = (Date.now() + '').slice(-10);
  // clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; //[lat.lang]
    this.distance = distance; // in km
    this.duration = duration; // in hour
  }

  // Setting description for the particular instance of the class
  _setDescription() {
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  /*
  // Increase the number of clicks
  click() {
    this.clicks++;
  }
  */
}

// Class Running
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  // Pace -> min/km
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
// Class Cycling
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  // SPEED -> km/hr
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// TEST
// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cyc1 = new Running([39, -12], 2.5, 42, 871);
// console.log(run1, cyc1);

/////////////////////////////////////////////////////////

// APPLICATION ARCHITECTURE

// Class App
class App {
  // Private class fields
  #map;
  #mapEvent;
  #workouts = [];
  #zoomLevel = 13;
  // load page
  constructor() {
    // Get users current position
    this._getposition();

    // get local storage
    this._getLocalStorage();

    // Add the event listners
    // Workout Form
    // This keyword used inside of a class refers to the current instance.
    form.addEventListener('submit', this._newWorkout.bind(this));

    // toggle between cadence and elevation
    inputType.addEventListener('change', this._toggleElevationField);

    // Move map on click on workout
    containerWorkouts.addEventListener('click', this._moveToPopUp.bind(this));

    // remove specific workout
    containerWorkouts.addEventListener('click', this._removeWorkout.bind(this));

    // Rest
    reset.addEventListener('click', this.reset);
  }

  _getposition() {
    // Geolocation API
    /*
    var options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
      };
    */
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Unable to get your current location');
        }
        //,options
      );
  }
  // Receive Position
  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#zoomLevel);
    // console.log(map);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // on clicking on the map
    this.#map.on('click', this._showForm.bind(this));
    // console.log(this);

    // The map is not loaded right at the beginning when the page loads , so we wait for the map to load in order to rander the markers.
    // Part 2 -> Render Markers
    this.#workouts.forEach(e => {
      this._renderWorkoutMarker(e);
    });
  }

  // click on map event
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
    // console.log(this.#mapEvent, mapE);
  }

  // Hide form + Clear Input Field
  _hideform() {
    inputDistance.value = inputCadence.value = inputDuration.value = inputElevation.value =
      '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
  }

  // Change Input
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  // Submit Form & Input your workout
  // Bulk of our logic
  _newWorkout(e) {
    // Prevent Default Form Behavior of submit
    e.preventDefault();

    // Helper functions
    // check inputs are number
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    // check inputs are positive
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // Get Data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // if workout running , create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert('Inputs have to be positive numbers !');
      }
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // if workout cycling , create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        return alert('Inputs have to be positive numbers !');
      }
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // add new object to workout array
    this.#workouts.push(workout);
    // console.log(workout);

    // render workout on map as marker
    this._renderWorkoutMarker(workout);

    //  Render workout onlist
    this._renderWorkout(workout);

    // Hide form + Clear Input Field
    this._hideform();

    // Set Local storage to all workouts || Store "Workouts" array in the local storage
    this._SetLocalStorage();
  }
  _renderWorkoutMarker(workout) {
    // Display Marker
    L.marker(workout.coords) //array of [lat,lng]
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'} ${workout.description}`
      )
      .openPopup();
  }
  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${
          workout.description
        }<i class="fas fa-times"></i></h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;
    // checking type of workout to complete the html
    if (workout.type === 'running') {
      html += `
      <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;
    }
    if (workout.type === 'cycling') {
      html += `
      <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
      `;
    }
    form.insertAdjacentHTML('afterend', html);
    // document.querySelector('.workouts').insertAdjacentHTML('afterbegin', html);
  }

  // Move map on clicking on workout
  _moveToPopUp(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    // Searching for the workout element in the workouts list using "ID"
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    // In-built Methods in leaflet library
    this.#map.setView(workout.coords, this.#zoomLevel),
      {
        animate: true,
        pan: {
          duration: 1,
        },
      };

    /*
    // Using Public Interface
    workout.click();
    console.log(workout);
    */
  }

  // Local storage
  _SetLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  // Get data from local storage
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    // guard clause
    if (!data) return;
    this.#workouts = data;
    // Part 1 -> render workouts
    this.#workouts.forEach(e => {
      this._renderWorkout(e);
    });
    // Part 2 in load map
  }
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
  // Remove a workout
  _removeWorkout(e) {
    if (!e.target.classList.contains('fas')) return;
    const workout = e.target.closest('.workout');
    const id = workout.dataset.id;
    this.#workouts = this.#workouts.filter(e => e.id !== id);
    this._SetLocalStorage();
    location.reload();
    // containerWorkouts.remove(workout);
  }
}

const app = new App();
