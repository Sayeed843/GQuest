/**
 * GreenQuest NOVA — Expo / React Native prototype
 * Adapted from GreenQuest NOVA Figma (8 editable mobile frames)
 * Figma: https://www.figma.com/design/bfsT5gInmbXH07rarX9nSr
 *
 * This demo deliberately uses ILLUSTRATIVE carbon figures and rule-based matches.
 * No emission factor or ML recommendation is claimed to be scientifically validated.
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Ionicons} from '@expo/vector-icons';

type Route = 'welcome' | 'home' | 'assessment' | 'carbon' | 'recommendations' | 'challenges' | 'details' | 'progress';
type Category = 'Mobility' | 'Food' | 'Energy';
type QuestId = 'commute' | 'plate' | 'power';
type Quest = {
  id: QuestId;
  title: string;
  description: string;
  subtitle: string;
  category: Category;
  icon: keyof typeof Ionicons.glyphMap;
  duration: string;
  xp: number;
  goal: number;
  color: string;
  surface: string;
  steps: string[];
};
type Answers = Record<string, string>;
type Progress = Partial<Record<QuestId, number>>;
type Stored = {started: boolean; answers: Answers; progress: Progress; selectedQuest: QuestId};

const STORAGE_KEY = '@greenquest/nova-demo-v1';
const C = {
  navy: '#12142E', ink: '#1C1D3C', purple: '#775BFA', violet: '#5B42DD',
  lilac: '#EEE9FF', lightPurple: '#A995FF', bg: '#F7F6FC', white: '#FFFFFF',
  muted: '#787B99', pink: '#FE7B94', yellow: '#FFD05B', sky: '#70CFF0',
  border: '#E6E3F0', darkCard: '#292B52', darkText: '#C2C2DC',
};

const QUESTS: Quest[] = [
  {id:'commute', title:'Car-free commute', subtitle:'Choose a lighter way to move', description:'Replace 3 short car journeys with a more planet-friendly way of travelling.', category:'Mobility', icon:'bicycle-outline', duration:'7 DAYS', xp:120, goal:3, color:C.purple, surface:C.lilac,
    steps:['Choose a short trip you normally make by car.','Walk, cycle or use public transport instead.','Log the journey here to track your quest.']},
  {id:'plate', title:'Plant-powered pair', subtitle:'Swap 2 meals this week', description:'Try two plant-based meals during the week and discover a new favourite.', category:'Food', icon:'leaf-outline', duration:'7 DAYS', xp:90, goal:2, color:C.pink, surface:'#FFE8E6',
    steps:['Pick a meal you would like to adapt.','Choose a plant-based alternative.','Log each meal when you complete it.']},
  {id:'power', title:'Switch it off', subtitle:'Save energy at home', description:'Turn off unused lights and devices on three separate occasions.', category:'Energy', icon:'flash-outline', duration:'5 DAYS', xp:75, goal:3, color:'#D09B32', surface:'#FFF3DB',
    steps:['Find a light or device you are not using.','Switch it off safely.','Log the action to move closer to completion.']},
];

const QUESTIONS = [
  {id:'transport', headline:'How do you usually travel short distances?', options:['Walk most of the time','Ride a bicycle','Public transport','Car or ride-hailing']},
  {id:'food', headline:'Which description fits your meals best?', options:['Mostly plant-based','A mix of plant-based and meat','Meat or fish most days','I am not sure']},
  {id:'energy', headline:'How often do you save electricity at home?', options:['Almost every day','A few times a week','Occasionally','Rarely']},
  {id:'motivation', headline:'What would you like to improve first?', options:['Transport habits','Food choices','Home energy use','Try a bit of everything']},
];

function Caption({children,light=false}: {children:React.ReactNode;light?:boolean}) {
  return <Text style={[s.caption, light&&{color:'#C7C1E9'}]}>{children}</Text>;
}
function Title({children,light=false,size=28,style}: {children:React.ReactNode;light?:boolean;size?:number;style?:any}) {
  return <Text style={[s.title,{fontSize:size,lineHeight:Math.ceil(size*1.2),color:light?C.white:C.ink},style]}>{children}</Text>;
}
function Body({children,light=false,style}: {children:React.ReactNode;light?:boolean;style?:any}) {
  return <Text style={[s.body,{color:light?C.darkText:C.muted},style]}>{children}</Text>;
}
function Pill({label,color=C.lilac,textColor=C.violet}: {label:string;color?:string;textColor?:string}) {
  return <View style={[s.pill,{backgroundColor:color}]}><Text style={[s.pillText,{color:textColor}]}>{label}</Text></View>;
}
function BigButton({label,onPress,dark=false,pink=false,disabled=false}: {label:string;onPress:()=>void;dark?:boolean;pink?:boolean;disabled?:boolean}) {
  const bg=dark?C.navy:pink?C.pink:C.purple;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({pressed})=>[s.bigButton,{backgroundColor:bg,opacity:pressed?0.82:disabled?0.48:1}]}>
    <Text style={[s.bigButtonLabel,{color:pink?C.navy:C.white}]}>{label}</Text>
    <View style={[s.arrowCircle,{backgroundColor:pink?C.navy:C.white}]}><Ionicons name="arrow-forward" size={15} color={bg}/></View>
  </Pressable>;
}
function Card({children,style}: {children:React.ReactNode;style?:any}) {return <View style={[s.card,style]}>{children}</View>;}
function ProgressBar({fraction,dark=false}: {fraction:number;dark?:boolean}) {return <View style={[s.bar,{backgroundColor:dark?'#AAA1EF':C.lilac}]}><View style={[s.barFill,{width:`${Math.min(100,Math.max(0,fraction*100))}%`,backgroundColor:dark?C.yellow:C.purple}]}/></View>;}

export default function App() {
  const [route,setRoute] = useState<Route>('welcome');
  const [started,setStarted] = useState(false);
  const [loaded,setLoaded] = useState(false);
  const [answers,setAnswers] = useState<Answers>({});
  const [question,setQuestion] = useState(0);
  const [progress,setProgress] = useState<Progress>({});
  const [selectedQuest,setSelectedQuest] = useState<QuestId>('commute');
  const [filter,setFilter] = useState<'All quests'|Category>('All quests');
  const [search,setSearch] = useState('');

  useEffect(()=>{let active=true; AsyncStorage.getItem(STORAGE_KEY).then(json=>{
    if (!active)return;
    if(json){try{const st:Stored=JSON.parse(json);setStarted(!!st.started);setAnswers(st.answers||{});setProgress(st.progress||{});setSelectedQuest(st.selectedQuest||'commute');setRoute(st.started?'home':'welcome');}catch{}}
  }).catch(()=>{}).finally(()=>{if(active)setLoaded(true)});return()=>{active=false};},[]);

  useEffect(()=>{if(!loaded)return;const st:Stored={started,answers,progress,selectedQuest};AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(st)).catch(()=>{});},[loaded,started,answers,progress,selectedQuest]);

  const chosen = QUESTS.find(q=>q.id===selectedQuest)||QUESTS[0];
  const completed = QUESTS.filter(q=>(progress[q.id]||0)>=q.goal);
  const active = QUESTS.filter(q=>(progress[q.id]||0)>0&&(progress[q.id]||0)<q.goal);
  const xp = completed.reduce((sum,q)=>sum+q.xp,0);
  const displayedLevel=1+Math.floor(xp/250);
  const matchingQuest:QuestId = useMemo(()=>{
    if(answers.motivation==='Food choices'||answers.food==='Meat or fish most days')return 'plate';
    if(answers.motivation==='Home energy use'||answers.energy==='Rarely')return 'power';
    return 'commute';
  },[answers]);
  const recommend = QUESTS.find(q=>q.id===matchingQuest)||QUESTS[0];

  const openQuest=useCallback((id:QuestId)=>{setSelectedQuest(id);setRoute('details');},[]);
  const joinQuest=()=>{setProgress(prev=>({...prev,[selectedQuest]:Math.max(0,prev[selectedQuest]||0)}));setRoute('progress');};
  const logAction=()=>setProgress(prev=>({...prev,[selectedQuest]:Math.min(chosen.goal,(prev[selectedQuest]||0)+1)}));
  const reset=()=>Alert.alert('Reset GreenQuest demo?','This clears locally stored answers and challenge progress.',[
    {text:'Cancel',style:'cancel'}, {text:'Reset',style:'destructive',onPress:()=>{setProgress({});setAnswers({});setQuestion(0);setStarted(false);setRoute('welcome');}}
  ]);
  const onBegin=()=>{setStarted(true);setRoute('home')};
  const onAssessmentNext=()=>{
    if(!answers[QUESTIONS[question].id])return;
    if(question<QUESTIONS.length-1)setQuestion(q=>q+1); else setRoute('carbon');
  };
  const dark=['welcome','recommendations','progress'].includes(route);
  const showTabs=['home','carbon','recommendations','challenges','progress'].includes(route);
  const navigateTab=(tab:'home'|'challenges'|'progress'|'carbon')=>{
    if(tab==='progress'&&!QUESTS.some(q=>progress[q.id]!==undefined)) {setRoute('challenges');return;}
    if(tab==='progress') {const id=QUESTS.find(q=>progress[q.id]!==undefined)?.id||'commute';setSelectedQuest(id);}
    setRoute(tab);
  };
  const viewStyle=[s.root,{backgroundColor:dark?C.navy:C.bg}];
  const list=QUESTS.filter(q=>(filter==='All quests'||q.category===filter) && (q.title+' '+q.subtitle).toLowerCase().includes(search.toLowerCase()));

  if(!loaded){return <View style={[s.root,s.loading]}><Text style={{color:C.purple,fontWeight:'800',fontSize:23}}>GreenQuest</Text></View>}

  return <SafeAreaView style={viewStyle}>
    <StatusBar backgroundColor={dark?C.navy:C.bg} barStyle={dark?'light-content':'dark-content'}/>
    <View style={s.flex}>
      {route==='welcome' && <ScrollView contentContainerStyle={[s.page,{minHeight:710,justifyContent:'space-between',backgroundColor:C.navy}]}>
        <View>
          <Text style={s.welcomeBrand}>G R E E N Q U E S T</Text>
          <Pill label="THE PLANET IS YOUR PLAYGROUND" color="#2A2C59" textColor="#D6D1FF"/>
        </View>
        <View style={s.planetWrap}>
          <View style={s.planetOrbitOuter}/><View style={s.planetOrbitInner}/>
          <View style={s.planet}><View style={s.planetShadow}/><View style={s.landOne}/><View style={s.landTwo}/></View>
          <Text style={[s.sparkle,{left:5,top:25,color:C.yellow}]}>✦</Text><Text style={[s.sparkle,{right:8,top:86,color:C.yellow}]}>✦</Text><Text style={[s.sparkle,{right:0,bottom:0,color:C.sky}]}>✦</Text>
        </View>
        <View><Title light size={37}>Small quests.</Title><Title light size={37} style={{color:C.yellow}}>Real impact.</Title>
          <Body light style={{marginTop:22,lineHeight:24}}>A playful way to build better habits.{'\n'}Take on missions. See your impact.{'\n'}Unlock your next challenge.</Body></View>
        <View><BigButton label="Begin your journey" pink onPress={onBegin}/><Text style={s.welcomeFoot}>NO ACCOUNT NEEDED · YOUR PROGRESS STAYS LOCAL</Text></View>
      </ScrollView>}

      {route==='home'&&<ScrollView contentContainerStyle={[s.page,{paddingBottom:25}]}>
        <View style={s.topRow}><View style={{flex:1}}><Caption>GOOD MORNING, EXPLORER</Caption><Title size={27}>Make today count.</Title></View>
        <View style={s.levelBadge}><Text style={s.levelSmall}>LEVEL {String(displayedLevel).padStart(2,'0')}</Text><Text style={s.levelBig}>{xp} XP</Text></View></View>
        <Pressable onPress={()=>{setSelectedQuest(active[0]?.id||completed[0]?.id||'commute');setRoute('progress')}} style={[s.activeCard,{marginTop:18}]}>
          <Pill label="YOUR ACTIVE QUEST" color="#A995FF" textColor={C.navy}/>
          <View style={s.bubble}><Text style={{color:C.white,fontSize:38}}>✦</Text></View>
          <Text style={s.activeTitle}>{active[0]?.title||'The car-free\ncommute'}</Text>
          <Text style={s.activeSubtitle}>{progress[active[0]?.id||'commute']||0} of {active[0]?.goal||3} actions logged</Text>
          <View style={{width:'74%'}}><ProgressBar fraction={(progress[active[0]?.id||'commute']||0)/(active[0]?.goal||3)} dark/></View>
          <View style={s.continuePill}><Text style={s.continueText}>CONTINUE  →</Text></View>
        </Pressable>
        <Caption>YOUR MOMENTUM</Caption>
        <View style={[s.row,{gap:12,marginTop:12}]}>
          <Momentum value={String(completed.length).padStart(2,'0')} label="COMPLETED" color={C.purple}/>
          <Momentum value={String(active.length).padStart(2,'0')} label="ACTIVE" color={C.pink}/>
          <Momentum value={String(xp)} label="XP EARNED" color="#E09A2A"/>
        </View>
        <View style={[s.row,{justifyContent:'space-between',marginTop:29,marginBottom:13}]}><Title size={18}>Made for your lifestyle</Title><Pressable onPress={()=>setRoute('recommendations')}><Text style={{color:C.purple,fontSize:12,fontWeight:'800'}}>See all</Text></Pressable></View>
        <View style={[s.row,{gap:12}]}>
          <Pressable onPress={()=>openQuest('power')} style={[s.suggestCard,{flex:1}]}><Text style={s.suggestTag}>EASY</Text><Text style={[s.suggestStar,{color:C.pink}]}>✦</Text><Text style={s.suggestTitle}>Power-down{ '\n'}hour</Text><Body style={{fontSize:11}}>7-day challenge</Body></Pressable>
          <Pressable onPress={()=>openQuest('plate')} style={[s.suggestCard,{flex:1}]}><Text style={[s.suggestTag,{color:C.pink}]}>5 DAYS</Text><Text style={[s.suggestStar,{color:C.sky}]}>✧</Text><Text style={s.suggestTitle}>Plant-based{ '\n'}plate</Text><Body style={{fontSize:11}}>2 meals / week</Body></Pressable>
        </View>
        <Pressable onPress={()=>{setQuestion(0);setRoute('assessment')}} style={s.assessLink}><Ionicons name="sparkles-outline" color={C.purple} size={16}/><Text style={s.assessText}>Personalize my quest recommendations →</Text></Pressable>
        <Pressable onPress={reset}><Text style={s.resetText}>Reset demo data</Text></Pressable>
      </ScrollView>}

      {route==='assessment'&&<ScrollView contentContainerStyle={[s.page,{flexGrow:1,paddingBottom:25}]}>
        <View style={{marginBottom:18}}><Caption>YOUR QUEST PROFILE</Caption><Title style={{marginTop:13}} size={28}>Tell us a little{'\n'}about your routine.</Title><Body style={{marginTop:12}}>This helps match challenges to your daily life.</Body></View>
        <View style={[s.row,{justifyContent:'space-between',marginTop:10,marginBottom:12}]}><Caption>QUESTION {String(question+1).padStart(2,'0')} OF {String(QUESTIONS.length).padStart(2,'0')}</Caption><Text style={{fontWeight:'700',color:C.ink}}>{Math.round((question+1)/QUESTIONS.length*100)}%</Text></View>
        <ProgressBar fraction={(question+1)/QUESTIONS.length}/>
        <Title style={{marginTop:28,marginBottom:21}} size={23}>{QUESTIONS[question].headline}</Title>
        {QUESTIONS[question].options.map((v,index)=>{
          const picked=answers[QUESTIONS[question].id]===v;
          return <Pressable key={v} onPress={()=>setAnswers(old=>({...old,[QUESTIONS[question].id]:v}))} style={[s.answer,{borderColor:picked?C.purple:'transparent',backgroundColor:picked?C.lilac:C.white}]}>
            <View style={[s.answerNumber,{backgroundColor:picked?C.purple:C.lilac}]}><Text style={{fontSize:11,fontWeight:'800',color:picked?C.white:C.purple}}>{String(index+1).padStart(2,'0')}</Text></View>
            <Text style={s.answerText}>{v}</Text>{picked&&<Ionicons name="checkmark-circle" size={24} color={C.purple}/>}</Pressable>;
        })}
        <View style={{flex:1,minHeight:22}}/>
        <View style={s.privacyPill}><Text style={{color:C.violet,fontSize:10,fontWeight:'800'}}>LOCAL-FIRST · NO SIGN-UP REQUIRED</Text></View>
        <BigButton label={question===QUESTIONS.length-1?'View my insights':'Next question'} disabled={!answers[QUESTIONS[question].id]} onPress={onAssessmentNext}/>
        {question>0&&<Pressable onPress={()=>setQuestion(q=>q-1)}><Text style={s.backText}>← Previous question</Text></Pressable>}
      </ScrollView>}

      {route==='carbon'&&<ScrollView contentContainerStyle={[s.page,{paddingBottom:28}]}>
        <Caption>OPTIONAL INSIGHT</Caption><Title style={{marginTop:14}} size={29}>Your footprint,{'\n'}in perspective.</Title>
        <Body style={{marginTop:12}}>A supporting estimate — not your final score.</Body>
        <Card style={{marginTop:24,alignItems:'center',paddingTop:18,paddingBottom:20}}>
          <Pill label="ILLUSTRATIVE EXAMPLE"/>
          <View style={s.footprintRing}><View style={s.footprintInner}><Title size={41}>240</Title><Body style={{textAlign:'center',fontWeight:'700'}}>kg CO₂e / month</Body><Text style={s.exampleLabel}>EXAMPLE ESTIMATE</Text></View></View>
        </Card>
        <Text style={[s.sectionLabel,{marginTop:24,marginBottom:12}]}>ESTIMATED BREAKDOWN</Text>
        <Breakdown name="Transport" value="100 kg" color={C.purple}/><Breakdown name="Food" value="80 kg" color={C.pink}/><Breakdown name="Home energy" value="60 kg" color={C.yellow}/>
        <Body style={{fontSize:11,marginBottom:16,marginTop:11}}>Demonstration values only. Validated emission factors and real calculations will be added in a later sprint.</Body>
        <BigButton label="Discover matching quests" onPress={()=>setRoute('recommendations')}/>
      </ScrollView>}

      {route==='recommendations'&&<ScrollView contentContainerStyle={[s.page,{paddingBottom:25,backgroundColor:C.navy}]}>
        <Caption light>SMART MATCHES / FOR YOU</Caption><Title light size={31} style={{marginTop:15}}>Your quest deck.</Title>
        <Body light style={{marginTop:4}}>Personalized from your lifestyle answers.</Body>
        <View style={[s.recommendCard,{marginTop:22}]}>
          <Pill label="BEST MATCH · EASY" color="#A995FF" textColor={C.navy}/>
          <View style={s.recommendSpark}><Text style={{color:C.white,fontSize:50}}>✦</Text></View>
          <Text style={s.recommendName}>{recommend.title}</Text><Body light style={{color:'#EFEBFF',marginTop:9,lineHeight:19}}>{recommend.description}</Body>
          <View style={s.whyBox}><Text style={{color:C.yellow,fontSize:22}}>✦</Text><View style={{flex:1}}><Text style={{color:C.navy,fontWeight:'800',fontSize:12}}>Why it fits you</Text><Text style={{color:'#3C2D70',fontSize:11}}>Based on your lifestyle answers (demo rules).</Text></View></View>
        </View>
        {QUESTS.filter(q=>q.id!==recommend.id).map(q=><Pressable onPress={()=>openQuest(q.id)} key={q.id} style={s.alternative}>
          <View style={{width:42,height:42,borderRadius:21,backgroundColor:'#46466F',justifyContent:'center',alignItems:'center'}}><Ionicons name={q.icon} color={q.color} size={25}/></View>
          <View style={{flex:1,marginLeft:11}}><Text style={{color:C.white,fontWeight:'800',fontSize:15}}>{q.title}</Text><Body light style={{fontSize:11,marginTop:4}}>{q.subtitle}</Body></View><Pill label="VIEW" color="#51467E" textColor={C.white}/>
        </Pressable>)}
        <View style={{marginTop:20}}><BigButton label="View top challenge" pink onPress={()=>openQuest(recommend.id)}/></View>
        <Pressable onPress={()=>setRoute('challenges')}><Text style={{color:'#BAB4DB',textAlign:'center',marginTop:16}}>Explore all challenges →</Text></Pressable>
      </ScrollView>}

      {route==='challenges'&&<ScrollView contentContainerStyle={[s.page,{paddingBottom:35}]} keyboardShouldPersistTaps="handled">
        <Caption>THE QUEST LIBRARY</Caption><Title size={28} style={{marginTop:12}}>Find your next quest.</Title><Body style={{marginTop:6}}>Small missions. Big energy.</Body>
        <View style={[s.searchBox,{marginTop:22}]}><Ionicons name="search" size={23} color={C.muted}/><TextInput placeholder="Search eco challenges" placeholderTextColor={C.muted} value={search} onChangeText={setSearch} style={s.searchInput}/></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:16,flexGrow:0}} contentContainerStyle={{gap:9,paddingRight:8}}>
          {(['All quests','Mobility','Food','Energy'] as const).map(item=><Pressable onPress={()=>setFilter(item)} key={item} style={[s.filterPill,{backgroundColor:filter===item?C.purple:C.white}]}><Text style={{fontSize:11,fontWeight:'800',color:filter===item?C.white:C.ink}}>{item}</Text></Pressable>)}
        </ScrollView>
        <Text style={[s.sectionLabel,{marginTop:23,marginBottom:14}]}>{list.length} QUEST{list.length===1?'':'S'} WAITING FOR YOU</Text>
        {list.map(q=><Pressable key={q.id} onPress={()=>openQuest(q.id)} style={s.questListCard}>
          <View style={[s.questIconSurface,{backgroundColor:q.surface}]}><Ionicons name={q.icon} color={q.color} size={37}/></View>
          <View style={{flex:1,marginLeft:13}}><Text style={{fontSize:10,fontWeight:'800',color:q.color}}>{q.category.toUpperCase()}</Text><Text style={s.questListTitle}>{q.title}</Text><Body style={{fontSize:11,marginTop:1}}>{q.subtitle}</Body></View>
          <View style={s.questDuration}><Text style={{fontSize:9,fontWeight:'800',color:C.muted}}>{q.duration}</Text></View>
        </Pressable>)}
        {list.length===0&&<Card><Body>No challenges match your search. Try another keyword.</Body></Card>}
        <View style={s.libraryHint}><Text style={{color:C.violet,fontSize:11,fontWeight:'800'}}>✦  PICK A QUEST THAT FITS YOUR ROUTINE</Text></View>
      </ScrollView>}

      {route==='details'&&<ScrollView contentContainerStyle={{paddingBottom:28}}>
        <View style={s.detailHero}>
          <View style={{marginHorizontal:24,marginTop:26}}><Pill label={`${chosen.category.toUpperCase()} / GREENQUEST MISSION`} color="#FFD1D3" textColor="#923D59"/></View>
          <Title size={36} style={{marginHorizontal:24,marginTop:16,maxWidth:'74%',color:C.navy}}>{chosen.title}</Title>
          <View style={s.heroIllustration}><Ionicons name={chosen.icon} color={C.navy} size={66}/></View>
          <View style={{marginTop:'auto',marginLeft:24,marginBottom:21,flexDirection:'row',gap:8}}>
            <Pill label="EASY" color={C.white} textColor={C.navy}/><Pill label={chosen.duration} color={C.white} textColor={C.navy}/><Pill label={`${chosen.xp} XP`} color={C.white} textColor={C.navy}/>
          </View>
        </View>
        <View style={{paddingHorizontal:24,paddingTop:21}}>
          <Caption>THE MISSION</Caption><Title size={19} style={{marginTop:12,lineHeight:28}}>{chosen.description}</Title>
          <Text style={[s.sectionLabel,{color:C.purple,marginTop:28,marginBottom:18}]}>HOW IT WORKS</Text>
          {chosen.steps.map((step,i)=><View key={step} style={[s.row,{gap:13,alignItems:'center',marginBottom:15}]}><View style={s.stepCircle}><Text style={{fontSize:11,fontWeight:'800',color:C.purple}}>{String(i+1).padStart(2,'0')}</Text></View><Text style={{flex:1,fontSize:14,fontWeight:'600',color:C.ink}}>{step}</Text></View>)}
          <View style={s.detailInfo}><Text style={{fontSize:12,color:C.violet,fontWeight:'800'}}>✦  Impact estimate shown after completion</Text></View>
          <BigButton label={(progress[chosen.id]||0)>0?'Continue this quest':'Join this quest'} dark onPress={joinQuest}/>
          <Pressable onPress={()=>setRoute('challenges')}><Text style={s.backText}>← Back to all challenges</Text></Pressable>
        </View>
      </ScrollView>}

      {route==='progress'&&<ScrollView contentContainerStyle={[s.page,{paddingBottom:25,backgroundColor:C.navy}]}>
        <View style={[s.row,{justifyContent:'space-between',alignItems:'center'}]}><Caption light>YOUR QUEST PROGRESS</Caption><Pill label={`LEVEL ${String(displayedLevel).padStart(2,'0')}`} color="#343363" textColor={C.white}/></View>
        <View style={s.medalWrap}><Text style={[s.sparkle,{left:0,top:15,color:C.yellow}]}>✦</Text>
          <View style={s.medalHalo}><View style={s.medalInner}><Text style={{fontSize:40,fontWeight:'900',color:C.white}}>{Math.min(chosen.goal,progress[chosen.id]||0)}/{chosen.goal}</Text><Text style={{fontSize:12,color:'#E1DDF4',fontWeight:'700'}}>{chosen.id==='commute'?'TRIPS COMPLETED':'ACTIONS COMPLETED'}</Text></View></View>
          <Text style={[s.sparkle,{right:0,top:47,color:C.pink}]}>✦</Text>
        </View>
        <Title light size={30} style={{textAlign:'center',marginTop:4}}>{(progress[chosen.id]||0)>=chosen.goal?'Quest completed!':'Keep up the momentum!'}</Title>
        <Body light style={{textAlign:'center',marginTop:8}}>{chosen.title}</Body>
        <View style={[s.impactCard,{marginTop:26}]}>
          <Pill label="YOUR ENVIRONMENTAL IMPACT" color="#414275" textColor="#E6E1FF"/>
          <Text style={{fontSize:29,fontWeight:'900',color:C.yellow,marginTop:17}}>≈ 1.8 kg</Text>
          <Text style={{color:C.white,fontWeight:'700',marginTop:5}}>CO₂e avoided · example only</Text>
          <View style={{height:1,backgroundColor:'#484A73',marginVertical:11}}/>
          <Text style={{color:'#B8B4D5',fontSize:10}}>Illustrative: 3 × 4 km × 0.15 kg/km. Not a measured result.</Text>
        </View>
        <View style={[s.xpReward,{marginTop:14}]}><Ionicons name="star" color="#EC9E2D" size={39}/><View style={{marginLeft:13}}><Text style={{fontSize:23,fontWeight:'900',color:C.navy}}>{(progress[chosen.id]||0)>=chosen.goal?`+${chosen.xp} XP`:'XP reward locked'}</Text><Text style={{fontSize:12,color:'#716684',fontWeight:'600'}}>{(progress[chosen.id]||0)>=chosen.goal?'Reward earned · great work!':`${chosen.goal-(progress[chosen.id]||0)} more actions to earn ${chosen.xp} XP`}</Text></View></View>
        <View style={{marginTop:18}}>{(progress[chosen.id]||0)<chosen.goal?<BigButton label="Log one completed action" pink onPress={logAction}/>:<BigButton label="Find my next quest" pink onPress={()=>setRoute('challenges')}/>}</View>
        <Pressable onPress={()=>setRoute('home')}><Text style={{textAlign:'center',color:'#C2C2DC',marginTop:17,fontSize:12}}>Back to dashboard</Text></Pressable>
      </ScrollView>}
    </View>
    {showTabs&&<View style={[s.bottomNav,{backgroundColor:dark?C.navy:C.bg,borderTopColor:dark?'#383B66':C.border}]}>
      <NavItem icon="home-outline" label="Home" active={route==='home'} dark={dark} onPress={()=>navigateTab('home')}/>
      <NavItem icon="diamond-outline" label="Explore" active={route==='challenges'||route==='recommendations'} dark={dark} onPress={()=>navigateTab('challenges')}/>
      <NavItem icon="checkbox-outline" label="Active" active={route==='progress'} dark={dark} onPress={()=>navigateTab('progress')}/>
      <NavItem icon="stats-chart-outline" label="Impact" active={route==='carbon'} dark={dark} onPress={()=>navigateTab('carbon')}/>
    </View>}
  </SafeAreaView>;
}

function Momentum({value,label,color}:{value:string;label:string;color:string}){return <View style={s.momentum}><Text style={{fontSize:25,color,fontWeight:'900'}}>{value}</Text><Text style={{fontSize:10,color:C.muted,fontWeight:'800',marginTop:14}}>{label}</Text></View>}
function Breakdown({name,value,color}:{name:string;value:string;color:string}){return <View style={[s.row,{alignItems:'center',marginBottom:18}]}><View style={{width:13,height:13,borderRadius:7,backgroundColor:color,marginRight:9}}/><Text style={{color:C.ink,fontSize:14,fontWeight:'700',flex:1}}>{name}</Text><Text style={{color:C.ink,fontSize:13,fontWeight:'700'}}>{value}</Text></View>}
function NavItem({icon,label,active,dark,onPress}:{icon:keyof typeof Ionicons.glyphMap;label:string;active:boolean;dark:boolean;onPress:()=>void}){
  return <Pressable accessibilityRole="tab" accessibilityState={{selected:active}} onPress={onPress} style={[s.navItem,active&&{backgroundColor:dark?'#343262':C.lilac}]}>
    <Ionicons name={icon} size={23} color={active?C.purple:dark?'#A8A8CB':C.muted}/><Text style={{fontSize:10,fontWeight:active?'800':'500',color:active?C.purple:dark?'#A8A8CB':C.muted,marginTop:4}}>{label}</Text>
  </Pressable>
}

const s=StyleSheet.create({
  root:{flex:1}, flex:{flex:1}, loading:{alignItems:'center',justifyContent:'center'},
  page:{paddingHorizontal:24,paddingTop:Platform.OS==='android'?12:14,paddingBottom:15},
  row:{flexDirection:'row'},
  caption:{fontSize:11,fontWeight:'800',letterSpacing:0.45,color:C.purple},
  title:{fontWeight:'900',lineHeight:35,letterSpacing:-0.6}, body:{fontSize:13,lineHeight:19},
  sectionLabel:{fontSize:11,letterSpacing:0.5,fontWeight:'800',color:C.muted},
  card:{backgroundColor:C.white,borderRadius:20,padding:18},
  pill:{paddingVertical:8,paddingHorizontal:13,borderRadius:16,alignSelf:'flex-start'}, pillText:{fontSize:10,fontWeight:'800',letterSpacing:0.1},
  bigButton:{height:53,paddingLeft:16,paddingRight:12,borderRadius:13,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  bigButtonLabel:{fontSize:14,fontWeight:'800'}, arrowCircle:{width:27,height:27,borderRadius:14,alignItems:'center',justifyContent:'center'},
  bar:{height:8,borderRadius:7,overflow:'hidden'}, barFill:{height:'100%',borderRadius:7},
  welcomeBrand:{color:C.white,fontWeight:'900',fontSize:17,letterSpacing:1.1,marginTop:24,marginBottom:17},
  welcomeFoot:{fontSize:9,fontWeight:'800',color:'#A7A6CB',textAlign:'center',marginTop:20,marginBottom:5},
  planetWrap:{height:253,alignItems:'center',justifyContent:'center',marginTop:30,marginBottom:26},
  planetOrbitOuter:{position:'absolute',width:242,height:242,borderWidth:2,borderColor:'#525884',borderRadius:121},
  planetOrbitInner:{position:'absolute',width:212,height:212,borderWidth:2,borderColor:'#8287AB',borderRadius:106},
  planet:{width:178,height:178,borderRadius:89,backgroundColor:'#7774D0',overflow:'hidden',borderWidth:4,borderColor:'#A9A1EB'},
  planetShadow:{position:'absolute',width:106,height:106,borderRadius:53,backgroundColor:'#514B9D',right:8,bottom:9},
  landOne:{position:'absolute',width:78,height:44,borderTopLeftRadius:45,borderTopRightRadius:30,borderBottomLeftRadius:40,borderBottomRightRadius:20,backgroundColor:'#78CCB8',left:17,top:49,transform:[{rotate:'-22deg'}]},
  landTwo:{position:'absolute',width:58,height:32,borderRadius:20,backgroundColor:'#78CCB8',right:8,bottom:36,transform:[{rotate:'20deg'}]},
  sparkle:{position:'absolute',fontSize:30,fontWeight:'900'},
  topRow:{flexDirection:'row',alignItems:'center',marginTop:21,justifyContent:'space-between'},
  levelBadge:{width:70,height:70,borderRadius:17,backgroundColor:C.navy,justifyContent:'center',alignItems:'center'},
  levelSmall:{fontSize:9,fontWeight:'800',color:C.white}, levelBig:{fontSize:12,fontWeight:'900',color:C.white,marginTop:5},
  activeCard:{height:217,borderRadius:21,backgroundColor:C.violet,padding:14,position:'relative',overflow:'hidden',marginBottom:25},
  bubble:{position:'absolute',right:16,top:24,width:71,height:71,borderRadius:36,backgroundColor:'#8876F5',alignItems:'center',justifyContent:'center'},
  activeTitle:{fontSize:26,fontWeight:'900',lineHeight:29,color:C.white,maxWidth:240,marginTop:20},
  activeSubtitle:{fontSize:12,color:'#E7DFFF',fontWeight:'600',marginTop:10,marginBottom:10},
  continuePill:{marginTop:8,backgroundColor:C.white,alignSelf:'flex-start',borderRadius:7,paddingHorizontal:15,paddingVertical:3},
  continueText:{fontSize:9,fontWeight:'800',color:C.violet},
  momentum:{flex:1,minWidth:0,height:98,borderRadius:17,paddingHorizontal:12,paddingTop:17,backgroundColor:C.white},
  suggestCard:{backgroundColor:C.white,borderRadius:16,height:145,padding:14,position:'relative',justifyContent:'space-between'},
  suggestTag:{color:C.purple,fontSize:10,fontWeight:'800'}, suggestStar:{position:'absolute',right:17,top:14,fontSize:31},
  suggestTitle:{fontWeight:'900',fontSize:16,color:C.ink,lineHeight:19,marginTop:12},
  assessLink:{flexDirection:'row',gap:9,alignItems:'center',marginTop:21,paddingVertical:10},assessText:{color:C.violet,fontSize:12,fontWeight:'800'},
  resetText:{textAlign:'center',color:C.muted,fontSize:11,marginTop:15,textDecorationLine:'underline'},
  answer:{minHeight:61,borderRadius:13,flexDirection:'row',alignItems:'center',padding:13,marginBottom:12,borderWidth:2},
  answerNumber:{width:30,height:30,borderRadius:15,alignItems:'center',justifyContent:'center',marginRight:13},
  answerText:{fontSize:14,fontWeight:'700',color:C.ink,flex:1},
  privacyPill:{backgroundColor:C.lilac,height:31,borderRadius:10,alignItems:'center',justifyContent:'center',marginBottom:12},
  backText:{color:C.muted,fontWeight:'700',fontSize:12,textAlign:'center',paddingTop:17},
  footprintRing:{width:199,height:199,borderWidth:16,borderRadius:100,borderColor:C.purple,marginTop:12,padding:9},
  footprintInner:{flex:1,borderRadius:100,borderWidth:5,borderColor:C.lilac,justifyContent:'center',alignItems:'center'},
  exampleLabel:{fontSize:10,fontWeight:'800',color:C.purple,marginTop:10},
  recommendCard:{backgroundColor:C.violet,borderRadius:21,padding:17,minHeight:307,overflow:'hidden'},
  recommendSpark:{width:110,height:110,borderRadius:55,position:'absolute',right:-7,top:26,backgroundColor:'#A28BFF',alignItems:'center',justifyContent:'center'},
  recommendName:{fontSize:25,fontWeight:'900',color:C.white,marginTop:90},
  whyBox:{borderRadius:13,backgroundColor:'#9B85F7',padding:12,minHeight:55,flexDirection:'row',gap:12,alignItems:'center',marginTop:16},
  alternative:{height:76,backgroundColor:C.darkCard,borderRadius:15,marginTop:9,padding:12,flexDirection:'row',alignItems:'center'},
  searchBox:{height:53,borderRadius:14,backgroundColor:C.white,flexDirection:'row',alignItems:'center',paddingHorizontal:16},
  searchInput:{marginLeft:12,flex:1,color:C.ink,fontSize:13},filterPill:{borderRadius:18,height:36,paddingHorizontal:17,justifyContent:'center'},
  questListCard:{height:110,borderRadius:18,backgroundColor:C.white,flexDirection:'row',padding:13,alignItems:'center',marginBottom:12},
  questIconSurface:{height:80,width:72,borderRadius:14,alignItems:'center',justifyContent:'center'},
  questListTitle:{fontWeight:'900',fontSize:16,color:C.ink,marginTop:4},
  questDuration:{alignSelf:'flex-end',backgroundColor:C.lilac,borderRadius:7,paddingHorizontal:6,paddingVertical:5},
  libraryHint:{backgroundColor:C.lilac,paddingVertical:11,paddingHorizontal:9,borderRadius:10,alignItems:'center',marginTop:12},
  detailHero:{height:355,backgroundColor:C.pink,position:'relative'},
  heroIllustration:{position:'absolute',right:25,top:143,width:126,height:126,borderRadius:63,backgroundColor:'#FFD1D3',justifyContent:'center',alignItems:'center'},
  stepCircle:{width:33,height:33,borderRadius:17,backgroundColor:C.lilac,alignItems:'center',justifyContent:'center'},
  detailInfo:{backgroundColor:C.lilac,borderRadius:11,padding:12,marginTop:13,marginBottom:14},
  medalWrap:{height:269,alignItems:'center',justifyContent:'center',position:'relative',marginTop:15},
  medalHalo:{width:206,height:206,borderRadius:103,backgroundColor:'#5553A5',justifyContent:'center',alignItems:'center',borderWidth:12,borderColor:'#42427D'},
  medalInner:{width:171,height:171,borderRadius:86,backgroundColor:C.navy,justifyContent:'center',alignItems:'center',borderWidth:10,borderColor:C.yellow},
  impactCard:{height:161,borderRadius:20,backgroundColor:C.darkCard,padding:16},
  xpReward:{minHeight:75,backgroundColor:'#FFF5DF',borderRadius:17,padding:15,flexDirection:'row',alignItems:'center'},
  bottomNav:{height:64,flexDirection:'row',justifyContent:'space-around',paddingHorizontal:9,paddingTop:6,borderTopWidth:1},
  navItem:{width:'23%',height:51,borderRadius:14,alignItems:'center',justifyContent:'center'},
});