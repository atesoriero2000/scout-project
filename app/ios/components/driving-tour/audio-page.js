'use strict';

import React, { Component, } from 'react'
import {
  AppRegistry,
  StyleSheet,
  NavigatorIOS,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  VibrationIOS,
  Image,
} from 'react-native'

var Sound = require('react-native-sound');
var Turns = require('./turns');
//var f1 = require('../../audio/Page 11 (Owen).mp3');


const geoOpt = {enableHighAccuracy: true, timeout: 500, maximumAge: 500, distanceFilter: .5};

// var file1 = new Sound(f1,'',(error)=>{
//   if (error) {
//       console.log('failed to load the sound', error);
//     } else { // loaded successfully
//       console.log(`duration in seconds:  ${file1.getDuration()} number of channels:  ${file1.getNumberOfChannels()}`);
//   }
// });

var stage  = 0;
var turn = 0;

const radius = 5;


class AudioPage extends Component {


  constructor(props){
    super(props);
    this.state ={
      initialPos: 'unknown',
      lastPos: 'unknown',
      lastRadius: 0,
      speed: 0,
      picture: Turns.stages[stage].loc[turn].picture,
      directions: 'unknown',
      title: 'hi',
      intervalID: setInterval(() => this.geolocation() , 500),
    };

  }

  isNear(targetLat, targetLong, radius){
    return ( this.distTo(targetLat, targetLong) <= radius);
  }


  distTo(targetLat, targetLong){
    let lastLat = this.state.lastPos.latitude;
    let lastLong =  this.state.lastPos.longitude;
    return (Math.sqrt(Math.pow((lastLong-targetLong),2) + Math.pow((lastLat-targetLat),2)) * (364537+7/9) );
  }

  geolocation(){

    navigator.geolocation.getCurrentPosition((position) => {
      this.setState({lastPos: position.coords});
    }, (error) => alert(JSON.stringify(error)), geoOpt);


    let currentTurn = Turns.stages[stage].loc[turn];
    if(this.isNear(this.state.initialPos.latitude, this.state.initialPos.longitude, radius)){
      //turn++;
      console.log(turn);
    }

    let radius = this.distTo(this.state.initialPos.latitude, this.state.initialPos.longitude);
    let speed = (radius - this.state.lastRadius)/(11/15);

    this.setState({lastRadius: radius});
    this.setState({speed: speed});
    this.setState({picture: Turns.stages[stage].loc[turn].picture});
    this.setState({directions: Turns.stages[stage].loc[turn].directions});
  }

  triggerAudio(){

    // file1.play((success) => {
    //   if (success) {
    //     console.log('successfully finished playing');
    //   } else {
    //     console.log('playback failed due to audio decoding errors');
    //   }});
  }

  onPress(){


      stage++;

    //if(!this.state.playing){

      this.triggerAudio();

      //stage++;
      console.log("Stage Up: " + stage);
  //  }

  }

  resetPos(){
    this.setState({initialPos: this.state.lastPos});
    this.setState({lastRadius: 0});
    this.setState({speed: 0});
  }

  componentWillUnmount(){
    //navigator.geolocation.clearWatch(this.watchID);
    clearInterval(this.state.intervalID);
    this.props.navigator.popToTop();
  }

  componentWillUpdate(){
//  if(!this.state.picture === Turns.stages[stage][turn].picture){
  //}
  if(this.isNear(this.state.initialPos.latitude, this.state.initialPos.longitude, radius)){
    //  this.setState({isNear: 'true'});
      VibrationIOS.vibrate();
     } else {
    //  this.setState({isNear: 'false'});
    }

    if(this.props.unmount().b){
      this.props.navigator.popToTop();
    }

  }

  componentDidMount(){
    navigator.geolocation.getCurrentPosition((position) => {
      this.setState({initialPos: position.coords});
    }, (error) => alert(JSON.stringify(error)), geoOpt);

  }



  render() {
    return (
      <View style = {styles.container}>
        <Text style = {styles.text}>
          AUDIO PAGE
        </Text>

        <Text style = {styles.location}>
          INITIAL
        </Text>
        <Text> Longitude: {this.state.initialPos.longitude}</Text>
        <Text> Latitude: {this.state.initialPos.latitude}</Text>

        <Text style = {styles.location}>
          LAST
        </Text>
        <Text> Longitude: {this.state.lastPos.longitude}</Text>
        <Text> Latitude: {this.state.lastPos.latitude}</Text>
        <Text/>
        <Text> isNear: {JSON.stringify(this.isNear(this.state.initialPos.latitude, this.state.initialPos.longitude, radius))} </Text>
        <Text> Radius: {JSON.stringify(Math.round(this.state.lastRadius, 1))} FT</Text>
        <Text> Speed: {JSON.stringify(Math.round(this.state.speed, 1))}  MPH</Text>



        <Image
        style={styles.image}
        source={this.state.picture}
        />

        <TouchableOpacity style = {styles.button} onPress = {() => this.resetPos()}>
          <Text style={styles.buttonText} >Reset Position</Text>
        </TouchableOpacity>

        <TouchableOpacity style = {styles.button} onPress = {() => this.onPress()}>
          <Text style={styles.buttonText} >Click for audio</Text>
        </TouchableOpacity>

      </View>
    );
  }
}

const styles = StyleSheet.create({
  container:{
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    //backgroundColor: '#424ac1',
  },

  location:{
    fontSize: 20,
    color: 'black',
    fontWeight: '500',
    textAlign: 'center',
    paddingTop: 20
  },

  text:{
    fontSize: 50,
    color: 'black',
    fontWeight: '100',
    textAlign: 'center',
    paddingTop: 30,
  },

  button:{
    width: Dimensions.get('window').width/1.5,
    height: 36,
    backgroundColor: 'gray',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    //opacity: 0.5,
    bottom: 50,
    transform: [{translateY:50}],
  },

  image:{
    margin: 25,
    height: 100,
    width: 100,
  },

  buttonText:{
    fontSize: 15,
    color: 'white',
    fontWeight: '100',
  },

});

module.exports = AudioPage;
