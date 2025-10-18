// Credits to: Andreas Redeker - https://gist.github.com/andreasRedeker/7fa4f1ea16c4ab66b238bfb9e971e96c


const apiKey = "TODO" // TODO: Get your own API key from https://creativecommons.tankerkoenig.de/
const radius = 5;
const sort = "price";

//look for Internet
let internet_connection;

// set to true to use google maps instead of apple maps
const useGoogleMaps = false;
let fuelType = "e5";

// set latitude and longitude for a fixed location
// example: let latitude = 52.516; let longitude = 13.376;
let latitude;
let longitude;

const fuelTypes = {
  e5: "Super E5",
  e10: "Super E10",
  diesel: "Diesel",
};

const primaryColor = Color.blue();
const carIcon = SFSymbol.named("car.fill");
const mapIcon = SFSymbol.named("map.fill");

if (args.widgetParameter && paramsValid(args.widgetParameter)) {
  fuelType = args.widgetParameter;
}

const reqUrl = (location) =>
  `https://creativecommons.tankerkoenig.de/json/list.php?lat=${location.latitude.toFixed(
    3
  )}&lng=${location.longitude.toFixed(
    3
  )}&rad=${radius}&sort=${sort}&type=${fuelType}&apikey=${apiKey}`;

const station = await getPriceData();

let widget = await createWidget();
if (!config.runsInWidget) {
  await widget.presentSmall();
}

Script.setWidget(widget);
Script.complete();

async function createWidget(items) {
  let widget = new ListWidget();
  
  // set background
  // widget.backgroundColor = new Color("#424152", 0.1);
    
  // cache data for at least 5 minutes
  widget.refreshAfterDate = new Date(Date.now() + 300000);

  if (station) {
    let stationName;
    if (station.brand) {
      stationName = widget.addText(capitalize(station.brand));
    } else {
      stationName = widget.addText(capitalize(station.name));
    }
    stationName.font = Font.boldSystemFont(16);
    stationName.textColor = primaryColor;
    stationName.minimumScaleFactor = 0.5;
/* _Commeted out for better spacing_
    let street = widget.addText(capitalize(station.street));
    street.font = Font.mediumSystemFont(10);
    street.textColor = Color.gray();
*/  
    let place = widget.addText(capitalize(station.place));
    place.font = Font.mediumSystemFont(10);
    place.textColor = Color.gray();

    widget.url = useGoogleMaps ? getGoogleMapsUrl(station) : getAppleMapsUrl(station);

    widget.addSpacer(2);

    const row = widget.addStack();
    let car = row.addImage(carIcon.image);
    car.tintColor = Color.gray();
    car.imageSize = new Size(12, 12);

    row.addSpacer(4);

    const isOpen = station.isOpen ? "geöffnet" : "geschlossen";
    let dist = row.addText(station.dist + " km • " + isOpen);
    dist.font = Font.mediumSystemFont(10);
    dist.textColor = Color.gray();

    widget.addSpacer();

    const gasType = widget.addText(fuelTypes[fuelType]);
    gasType.font = Font.mediumSystemFont(12);
    gasType.textColor = Color.gray();

    const priceStack = widget.addStack();
    let price = priceStack.addText(station.price.toLocaleString().slice(0, -1));
    price.font = Font.boldSystemFont(32);
    price.textColor = primaryColor;

    let eur = priceStack.addText(" €");
    eur.font = Font.boldSystemFont(32);
    eur.textColor = primaryColor;
  } else if (apiKey === "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx") {
    let car = widget.addImage(carIcon.image);
    car.tintColor = primaryColor;
    car.imageSize = new Size(32, 32);
    car.centerAlignImage();
    widget.addSpacer(8);
    const missingApiKey = widget.addText("Bitte Tankerkönig API Key einfügen");
    missingApiKey.font = Font.mediumSystemFont(12);
    missingApiKey.textColor = Color.gray();
    missingApiKey.centerAlignText();
  } else if (internet_connection) {
    let map = widget.addImage(mapIcon.image);
    map.tintColor = primaryColor;
    map.imageSize = new Size(32, 32);
    map.centerAlignImage();
    widget.addSpacer(8);
    const loading = widget.addText("keine Tankstelle in der Nähe");
    loading.font = Font.mediumSystemFont(12);
    loading.textColor = Color.gray();
    loading.centerAlignText();
    	widget.addSpacer(10);    
  } else {   
    let car = widget.addImage(carIcon.image);
    car.tintColor = primaryColor;
    car.imageSize = new Size(32, 32);
    car.centerAlignImage();
    widget.addSpacer(8);
    const loading = widget.addText("Daten werden geladen");
    loading.font = Font.mediumSystemFont(12);
    loading.textColor = Color.gray();
    loading.centerAlignText();
    	widget.addSpacer(10);
  }
  
  // shows when last updated
	widget.addSpacer(2);
  let updatedText = widget.addText("Aktualisiert: " + formatTime(new Date()));
  updatedText.font = Font.italicSystemFont(8);
  updatedText.textColor = Color.gray();
  updatedText.centerAlignText();
  
  return widget;
}

async function getPriceData() {
  try {
    const location = await getLocation();
    if (location) {
      const data = await new Request(reqUrl(location)).loadJSON();
      internet_connection = true;
      if (data.ok) {
        if (data.stations.length > 0) {
          let openStations = data.stations.filter(
            (s) => s.isOpen == true && s.price != null
          );
          if (openStations.length > 0) {
            const station = openStations[0];
            return {
              name: station.name,
              brand: station.brand,
              street: station.street,
              houseNumber: station.houseNumber,
              place: station.place,
              postCode: station.postCode,
              price: station.price,
              dist: station.dist,
              isOpen: station.isOpen,
              lat: station.lat,
              lng: station.lng,
            };
          } else {
            console.log(`no stations found in radius ${radius} with price`);
            return null;
          }
        } else {
          console.log(`no stations found in radius ${radius}`);
          return null;
        }
      } else {
        console.log("data not ok");
        return null;
      }
    } else {
      console.log("no location found");
      return null;
    }
  } catch (e) {
    internet_connection = false;
    console.log(e);
    return null;
  }
}

async function getLocation() {
  if (latitude && longitude) {
    return { latitude: latitude, longitude: longitude };
  } else {
    try {
      Location.setAccuracyToKilometer();
      return await Location.current();
    } catch (e) {
      return null;
    }
  }
}

function paramsValid(input) {
  return input in fuelTypes;
}

function capitalize(string) {
  return string
    .toLowerCase()
    .replace(/\w\S*/g, (w) => w.replace(/^\w/, (c) => c.toUpperCase()));
}

function getGoogleMapsUrl(station) {
  let destination = station.lat + "," + station.lng;
  let url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=car`;
  return url.toString();
}

function getAppleMapsUrl(station) {
  let destination = station.lat + ',' + station.lng;
  let url = `http://maps.apple.com/?q=${destination}`;
  return url.toString();
}

function formatTime(date) {
  let hours = date.getHours();
  let minutes = date.getMinutes();
  // add a "0" if the number is smaller then 10 
  minutes = minutes < 10 ? "0" + minutes : minutes;
  return hours + ":" + minutes;
}
