import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { restaurantImage } from '../../data/foodImages';
const icons={thali:'🍛',biryani:'🍚',pizza:'🍕',burger:'🍔',chinese:'🥡',south_indian:'🥞',dessert:'🍰',sandwich:'🥪',street_food:'🥟'};
export default function FoodPhoto({id,category,style}) {
 const [failed,setFailed]=useState(false);
 const source=restaurantImage(id);
 return <View style={[styles.root,style]}>
  <LinearGradient colors={['#064E3B','#0F7A56']} style={StyleSheet.absoluteFill} />
  {source&&!failed ? <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" transition={180} onError={()=>setFailed(true)} /> : <View style={styles.fallback}><Text style={styles.emoji}>{icons[category]||'🍽️'}</Text></View>}
 </View>;
}
const styles=StyleSheet.create({root:{overflow:'hidden'},fallback:{flex:1,alignItems:'center',justifyContent:'center'},emoji:{fontSize:62}});
