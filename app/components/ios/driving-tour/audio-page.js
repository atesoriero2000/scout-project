//@flow
// 'use strict';

import React, { Component, } from 'react'
import {
  AppRegistry,
  StyleSheet,
  NavigatorIOS,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  TouchableHighlight,
  Vibration,
  Image,
  ScrollView,
} from 'react-native'

import Swiper from 'react-native-swiper';
import KeepAwake from 'react-native-keep-awake';
import BackgroundGeolocation from "react-native-background-geolocation";
import Sound from 'react-native-sound';

var Turns = require('../../turns');

var doneAtAudio = false;

var debug = 1;
debug = (debug === 1);

var tester = false;

class AudioPage extends Component {

  constructor(props){
    super(props);
    this.state ={
      clickable: true,
      lastPos: 'unknown',
      currentTargetPos: 'unknown',//{latitude: 0, longitude: 0},
      distToCurrent: 0,
      nextTargetPos: 'unknown',
      distToNext: 0,
      isNear: false, //next turn

      audioIsPlaying: false,

      picture: Turns.stages[Turns.stage].startPic,
      directions: 'NONE',
      title: Turns.stages[Turns.stage].title,
      // title: Turns.stages[10].title,
    };
  }

  componentWillMount(){

    BackgroundGeolocation.destroyLog();
    BackgroundGeolocation.configure({
      // Geolocation Config
      desiredAccuracy: 0,
      stationaryRadius: 25,
      distanceFilter: 0,
      disableElasticity: true,
      locationAuthorizationRequest: 'WhenInUse',
      // Activity Recognition
      disableStopDetection: true,
      // Application config
      debug: false, // <-- enable this hear sounds for background-geolocation life-cycle.
      logLevel: BackgroundGeolocation.LOG_LEVEL_OFF, //BackgroundGeolocation.LOG_LEVEL_VERBOSE,
      logMaxDays: 1,

    }, (state) => {
      console.log("- BackgroundGeolocation is configured and ready: ", state.enabled);
      if (!state.enabled) BackgroundGeolocation.start();
      BackgroundGeolocation.changePace(true);
    });

    Turns.stage = this.props.stage;
    Turns.turn = Turns.stages[Turns.stage].loc.length-1;

    Sound.setCategory('Playback', false);
    // Turns.stage = 4;
    // Turns.turn = 3;

  }

  componentDidMount(){

    KeepAwake.activate();

    BackgroundGeolocation.watchPosition((location) => this.geolocation(location), {
      interval: 1000,
      desiredAccuracy: 0,
      persists: true,
    });

    //####### set turns and stage to passed value in props ############
    this.onPress();
    // this.update();
  }

  componentWillUnmount(){
    this.DEBUG_stopAudio();
    doneAtAudio = false;
    BackgroundGeolocation.stopWatchPosition();
    KeepAwake.deactivate();
  }

  geolocation(position){

    let currentStage = Turns.stages[Turns.stage];
    let currentTurn = currentStage.loc[Turns.turn];

    //LOCATION UPDATE
    this.setState({
      lastPos: position.coords,
      currentTargetPos: {latitude: currentTurn.latitude, longitude: currentTurn.longitude},
      distToCurrent: this.distTo(currentTurn.latitude, currentTurn.longitude),
    });


    //SCREEN UPDATE

    // checks to see if atPic is being displayed
    // will only overide if atPic is not being displayed or if we are not at the last turn
    if(this.state.picture !== Turns.stages[Turns.stage].atPic){   // || currentStage.loc.length-1 > Turns.turn){
      this.setState({
        picture: currentTurn.picture,
        directions: currentTurn.direction,
      });
    }
    //if audio is not playing and we are close to the last turn
    this.setState({ clickable: (!this.state.audioIsPlaying && (currentStage.loc.length-1 === Turns.turn)  && (debug||this.state.distToCurrent < 150) )});


    //TURN UPDATE
    // Set our next turn to either the next turn in the array or
    // if we are on the last turn of the array already, the first next turn of the next location
    // this alows us to non restrictivly update state and not leave extrainious states that are not updated
    // exeption: on last turn of last location cannot look ahead so we use Turns.stage instead of Turns.stage+1
    let nextTurn = (currentStage.loc.length-1 > Turns.turn) ? currentStage.loc[Turns.turn+1] : Turns.stages[ (Turns.stage===14)?14:Turns.stage+1 ].loc[1];

    //STATE UPDATE
    this.setState({
      nextTargetPos: {latitude: nextTurn.latitude, longitude: nextTurn.longitude},
      distToNext: this.distTo(nextTurn.latitude, nextTurn.longitude),
      isNear: this.isNear(nextTurn.latitude, nextTurn.longitude, nextTurn.radius),
      nextRadius: nextTurn.radius, // NOTE: FOR DEBUGGING
    });

    //Only will increment turn counter if isNear is true and if not the last turn
    if(this.state.isNear && (currentStage.loc.length-1 > Turns.turn) ){
      Vibration.vibrate();
      BackgroundGeolocation.playSound(1300);
      Turns.turn++;
    }
  }

  onPress(){

    if(this.state.clickable){ // Does nothing if audio is playing or if not at location

      //HANDLE END TOUR
      // if its the last stage and we've played the atAudio and it is finished playing
      // removed this is already caught with clickable state && !this.state.audioIsPlaying){

      if(Turns.stage === 14 && doneAtAudio){
        this.endTour();
        return;
      }

      let currentStage = Turns.stages[Turns.stage];
      if(currentStage.atAudio === null) doneAtAudio = true; // if it doesnt have at audio, act like it has completed atAudio and continue

      if(!doneAtAudio){ // Has not done the at location audio

        this.triggerAudio(currentStage.atAudio);
        doneAtAudio = true;
        this.setState({
          title: currentStage.title,
          picture: currentStage.atPic,
          directions: 'Remain at the location until the audio is finished, then click the button to continue'});

      }else{ // has done at location audio or doesnt have any

        Turns.turn = 0;
        Turns.stage++;
        doneAtAudio = false;
        this.setState({ title: Turns.stages[Turns.stage].title, picture: Turns.stages[Turns.stage].loc[0].picture});
        // this.setState({ isNear: false });
        this.triggerAudio(Turns.stages[Turns.stage].toAudio);
        this.update();
      }
    }
  }

  update(){
    this.geolocation({ coords: this.state.lastPos });
  }

  endTour(){

    BackgroundGeolocation.stopWatchPosition();
    this.props.changeAtEnd(true);

    this.setState({
      clickable: false,
      title: 'Thankyou for taking the Tour!',
      directions: 'To exit this page, click the "End Tour" button in the top left corner. For direction back to the Schoolhouse, click the "Return Home" button in the top right corner.',
      picture: Turns.endPic,
    });

    this.triggerAudioBool(Turns.endAudio, false);
  }

  isNear(targetLat, targetLong, radius){
    return ( this.distTo(targetLat, targetLong) <= radius);
  }

  distTo(targetLat, targetLong){
    let lastLat = this.state.lastPos.latitude;
    let lastLong =  this.state.lastPos.longitude;

    // if(targetLat === null){return true}

    let φ1 = lastLat/180 * Math.PI, φ2 = targetLat/180 * Math.PI, Δλ = (targetLong-lastLong)/180 * Math.PI, R = 3959 * 5280;
    let d = Math.acos( Math.sin(φ1)*Math.sin(φ2) + Math.cos(φ1)*Math.cos(φ2) * Math.cos(Δλ) ) * R;

    return d;

    //return (Math.sqrt(Math.pow((lastLong-targetLong),2) + Math.pow((lastLat-targetLat),2)) * (364537+7/9) );
  }

  triggerAudioBool(audioFile, shouldUpdate){
    audioFile.play(() => {
      this.setState({ audioIsPlaying: false });
      if(shouldUpdate)this.update();
    });
    this.setState({ audioFile, audioIsPlaying: true, clickable: false }); // clickable set so button immediatly changes
  }

  triggerAudio(audioFile){
    this.triggerAudioBool(audioFile, true);
  }

  DEBUG_stopAudio(){
    this.state.audioFile.stop();
    this.setState({audioIsPlaying: false});
    this.update();
  }

  DEBUG_nextTurn(){
    Vibration.vibrate();
    BackgroundGeolocation.playSound(1300);

    if(Turns.stages[Turns.stage].loc.length-1 <= Turns.turn){
      Turns.turn = 0;
      Turns.stage++;
    }else{
      Turns.turn++;
    }
  }

  DEBUG_lastTurn(){
    Vibration.vibrate();
    BackgroundGeolocation.playSound(1301);

    if(Turns.turn === 0){
      Turns.stage--;
      Turns.turn = Turns.stages[Turns.stage].loc.length-1;
    }else{
      Turns.turn--;
    }
  }


  render() {
    return (

      <View style = {styles.container}>
        {/* <ScrollView><View style = {styles.container}> */}

          <View style = {styles.banner}/>

          <View style = {styles.titleBox}>
            <Text style = {styles.title}>{this.state.title}</Text>
          </View>

          <View style = {styles.line}/>

          <View style = {styles.directionBox}>
            <Text style = {styles.directions}>{this.state.directions}</Text>
          </View>

          <Text style = {styles.dist}>
            {doneAtAudio?'':('In: ' + ( (Turns.turn === 0)?'0':JSON.stringify(Math.round(this.state.distToCurrent)) ) + ' FT')}
          </Text>


          {Array.isArray(this.state.picture)?

            <View style={styles.imageBox}>
              <Swiper
                showsButtons = {false}
                loop = {true}
                height={250 * (Dimensions.get('window').width/375)}
                width={Dimensions.get('window').width}
                autoplay={true}
                autoplayTimeout={2.5}>

                  {this.state.picture.map( onePic => <Image style={styles.image} source={onePic} key={Math.random()}/> )}

              </Swiper>
            </View>:

            <View style={styles.imageBox}>
              <Image style = {styles.image} source = {this.state.picture}/>
            </View>
          }

          <TouchableHighlight style = {{
            width: Dimensions.get('window').width/1.5,
            height: 36 * (Dimensions.get('window').height/667),
            backgroundColor: 'gray',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'absolute',
            top: (262 + 310) * (Dimensions.get('window').height/667),
            opacity: this.state.clickable?1:.05,
          }}
          underlayColor = '#BBBBBB'
          onPress = {() => this.onPress()}>
            <Text style={styles.buttonText}>Click to Continue</Text>
          </TouchableHighlight>

          {debug||tester?
            <TouchableOpacity style = {styles.debug1} onPress={() => this.DEBUG_stopAudio()}>
              <Text style={{color: 'white'}}>{'X'}</Text>
            </TouchableOpacity>:null
          }

          {debug?
            <TouchableOpacity style = {styles.debug2} onPress={() => this.DEBUG_lastTurn()}>
              <Text style={{color: 'white'}}>{'<'}</Text>
            </TouchableOpacity>:null
          }

          {debug?
            <TouchableOpacity style = {styles.debug3} onPress={() => this.DEBUG_nextTurn()}>
              <Text style={{color: 'white'}}>{'>'}</Text>
            </TouchableOpacity>:null
          }

          {debug?<Text style={{position: 'absolute', top: 285, left: 285}}>{Turns.stage},{Turns.turn}</Text>:null}

          {debug?<Text style={{
            position: 'absolute',
            top: 262 + 50,
            left: 220
          }}> distToNext: {JSON.stringify(Math.round(this.state.distToNext))} FT</Text>:null}
          {debug?<Text style={{
            position: 'absolute',
            top: 262 + 77,
            left: 220
          }}> nextRadius: {JSON.stringify(this.state.nextRadius)} </Text>:null}
          {debug?<Text style={{
            position: 'absolute',
            top: 262 + 104,
            left: 220
          }}> isNear: {JSON.stringify(this.state.isNear)} </Text>:null}

          {false?
            <View style={{alignItems: 'center', justifyContent: 'center', width: Dimensions.get('window').width}}>
              <View style={{height: 300}}/>
              <Text style = {styles.text}>
                DEBUGGER
              </Text><Text/>

              <Text> Stage/Turn:   {Turns.stage},{Turns.turn}</Text>

              <Text style = {styles.location}>
                CURRENT TARGET
              </Text>
              <Text> Longitude: {this.state.currentTargetPos.longitude}</Text>
              <Text> Latitude: {this.state.currentTargetPos.latitude}</Text>
              <Text> distToCurrent: {JSON.stringify(Math.round(this.state.distToCurrent))} FT</Text>

              <Text style = {styles.location}>
                NEXT TARGET
              </Text>
              <Text> Longitude: {this.state.nextTargetPos.longitude}</Text>
              <Text> Latitude: {this.state.nextTargetPos.latitude}</Text>
              <Text/>
              <Text> distToNext: {JSON.stringify(Math.round(this.state.distToNext))} FT</Text>
              <Text> isNear: {JSON.stringify(this.state.isNear)} </Text>

              <Text style = {styles.location}>
                LAST
              </Text>
              <Text> Longitude: {this.state.lastPos.longitude}</Text>
              <Text> Latitude: {this.state.lastPos.latitude}</Text>
              <Text/>
            </View>:null
          }
        {/* </View></ScrollView> */}
      </View>
    );
  }
}

const styles = StyleSheet.create({

  container:{
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 10 * (Dimensions.get('window').height/667),
  },

  banner:{
    width: Dimensions.get('window').width,
    height: 64 * (Dimensions.get('window').height/667),
  },

  titleBox:{
    width: Dimensions.get('window').width,
    height: 100 * (Dimensions.get('window').height/667),
    justifyContent: 'center',
    alignItems: 'center',
  },

  title:{
    fontSize: 30 * (Dimensions.get('window').width/375),
    textAlign: 'center',
    color: 'black',
    fontWeight: '300',
    paddingTop: 5 * (Dimensions.get('window').height/667),
    paddingHorizontal: 45 * (Dimensions.get('window').width/375),
  },

  line:{
    backgroundColor: 'black',
    height: .74 * (Dimensions.get('window').height/667),
    width: Dimensions.get('window').width / 3,
  },

  dist:{
    fontSize: 15 * (Dimensions.get('window').width/375),
    color: 'dimgray',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 3 * (Dimensions.get('window').height/667),
  },

  directionBox:{
    width: 325 * (Dimensions.get('window').width/375),
    height: 107 * (Dimensions.get('window').height/667),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10 * (Dimensions.get('window').height/667),
  },

  directions:{
    fontSize: 18 * (Dimensions.get('window').width/375),
    color: 'gray',
    fontWeight: '300',
    textAlign: 'center',
  },

  imageBox:{
    position: 'absolute',
    top: 310 * (Dimensions.get('window').width/375),
    height: 250 * (Dimensions.get('window').width/375),
    width: Dimensions.get('window').width,
    alignItems: 'center',
    justifyContent: 'center',
  },

  image:{
    height: 250 * (Dimensions.get('window').width/375),
    width: Dimensions.get('window').width,
    alignSelf: 'center',
  },

  buttonText:{
    fontSize: 15 * (Dimensions.get('window').width/375),
    color: 'white',
    fontWeight: '100',
    textAlign: 'center',
  },

  //DEBUGGER STYLES

  debug1: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 275 * (Dimensions.get('window').width/375),
    left: 15 * (Dimensions.get('window').width/375),
    backgroundColor: 'gray',
    height: 30 * (Dimensions.get('window').width/375),
    width: 30 * (Dimensions.get('window').width/375),
    borderRadius: 15 * (Dimensions.get('window').width/375),
  },

  debug2: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 275 * (Dimensions.get('window').width/375),
    left: 55 * (Dimensions.get('window').width/375),
    backgroundColor: 'gray',
    height: 30 * (Dimensions.get('window').width/375),
    width: 30 * (Dimensions.get('window').width/375),
    borderRadius: 15 * (Dimensions.get('window').width/375),
  },

  debug3: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 275 * (Dimensions.get('window').width/375),
    left: 95 * (Dimensions.get('window').width/375),
    backgroundColor: 'gray',
    height: 30 * (Dimensions.get('window').width/375),
    width: 30 * (Dimensions.get('window').width/375),
    borderRadius: 15 * (Dimensions.get('window').width/375),
  },

  location:{
    fontSize: 20 * (Dimensions.get('window').width/375),
    color: 'black',
    fontWeight: '500',
    textAlign: 'center',
    paddingTop: 20 * (Dimensions.get('window').width/375),
  },

  text:{
    fontSize: 50 * (Dimensions.get('window').width/375),
    color: 'black',
    fontWeight: '100',
    textAlign: 'center',
    marginTop: 30 * (Dimensions.get('window').width/375),
  },

  button:{
    width: Dimensions.get('window').width/1.5,
    height: 36 * (Dimensions.get('window').width/375),
    backgroundColor: 'gray',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },

  halfButton:{
    width: Dimensions.get('window').width/1.5/2 - 5,
    height: 36 * (Dimensions.get('window').width/375),
    backgroundColor: 'gray',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },

  halfButtonView:{
    flex: 2,
    flexDirection: 'row',
    width: Dimensions.get('window').width/1.5,
    height: 36 * (Dimensions.get('window').width/375),
    backgroundColor: 'gray',
    justifyContent: 'center',
    alignSelf: 'center',
    margin: 5 * (Dimensions.get('window').width/375),
  },
});

module.exports = AudioPage;