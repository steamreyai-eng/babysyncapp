var _interopRequireWildcard=require("@babel/runtime/helpers/interopRequireWildcard").default;var _interopRequireDefault=require("@babel/runtime/helpers/interopRequireDefault").default;Object.defineProperty(exports,"__esModule",{value:true});exports.default=void 0;var _asyncToGenerator2=_interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));var _toConsumableArray2=_interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));var _defineProperty2=_interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));var _slicedToArray2=_interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));var _Wrapper=require("../components/ui/Wrapper");var _Surface=require("../components/ui/Surface");var _Typography=require("../components/ui/Typography");
var _react=_interopRequireWildcard(require("react"));
var _reactNative=require("react-native");



var _reactNativePagerView=_interopRequireDefault(require("react-native-pager-view"));
var _vectorIcons=require("@expo/vector-icons");
var _expoLinearGradient=require("expo-linear-gradient");
var _lucideReactNative=require("lucide-react-native");
var _authStore=require("../store/authStore");
var _db=require("../db");
var _useRoutineEngine=require("../hooks/useRoutineEngine");
var _useRituals2=require("../hooks/useRituals");
var _DateTimePickerModal=_interopRequireDefault(require("../components/DateTimePickerModal"));var _jsxRuntime=require("react/jsx-runtime");

var _Dimensions$get=_reactNative.Dimensions.get('window'),SCREEN_WIDTH=_Dimensions$get.width;




var StatusDashboard=function StatusDashboard(_ref)




{var leapInfo=_ref.leapInfo,norms=_ref.norms,adaptations=_ref.adaptations,ageWeeks=_ref.ageWeeks,ageMo=_ref.ageMo,sources=_ref.sources;
var days=Math.round(ageMo%1*30);
var m=Math.floor(ageMo);
if(days>=30){m+=1;days=0;}
var ageLabel=ageMo<1?`${ageWeeks} нед`:`${m} мес ${days} дн`;

return(
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{gap:16},children:[

(0,_jsxRuntime.jsxs)(_Surface.Surface,{style:[{shadowColor:"#000",shadowOffset:{width:0,height:4},shadowOpacity:0.04,shadowRadius:16,elevation:2},{padding:20,overflow:'hidden'}],bg:"white",radius:"xxl",variant:"elevated",borderWidth:1,borderColor:"#F0ECE8",children:[
(0,_jsxRuntime.jsx)(_expoLinearGradient.LinearGradient,{
colors:['#667EEA','#764BA2'],
start:{x:0,y:0},
end:{x:1,y:1},
style:[{position:"absolute",top:0,left:0,right:0,bottom:0},{borderRadius:20}]}
),
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{zIndex:1},children:[
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:12,fontFamily:'Nunito_800ExtraBold',color:'rgba(255,255,255,0.7)',textTransform:'uppercase',letterSpacing:1},variant:"body",weight:"extraBold",children:"\u0412\u041E\u0417\u0420\u0410\u0421\u0422 \u041C\u0410\u041B\u042B\u0428\u0410"}

),
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:32,fontFamily:'Nunito_900Black',color:'white',marginTop:4},variant:"body",weight:"black",children:
ageLabel}
),
(0,_jsxRuntime.jsxs)(_Typography.Typography,{style:{fontSize:13,fontFamily:'Nunito_700Bold',color:'rgba(255,255,255,0.8)',marginTop:4},variant:"body",weight:"bold",children:[
ageWeeks," \u043D\u0435\u0434\u0435\u043B\u044C \xB7 \u044D\u0442\u0430\u043F: ",norms.ageLabel]}
)]}
)]}
),


leapInfo.status!=='none'&&leapInfo.leap&&
(0,_jsxRuntime.jsxs)(_Surface.Surface,{style:[{shadowColor:"#000",shadowOffset:{width:0,height:4},shadowOpacity:0.04,shadowRadius:16,elevation:2},{
padding:20,
borderColor:leapInfo.status==='during'?'#FDE68A':leapInfo.status==='before'?'#8B5CF6':'#4DBFAA',
backgroundColor:leapInfo.status==='during'?'#FFFBEB':leapInfo.status==='before'?'#FAF5FF':'#F0FDF4'
}],bg:"white",radius:"xxl",variant:"elevated",borderWidth:1,borderColor:"#F0ECE8",children:[
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:12},children:[
(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{style:{
width:44,height:44,borderRadius:16,alignItems:'center',justifyContent:'center',
backgroundColor:leapInfo.status==='during'?'#F59E0B':leapInfo.status==='before'?'#8B5CF6':'#4DBFAA'
},children:
(0,_jsxRuntime.jsx)(_vectorIcons.Ionicons,{
name:leapInfo.status==='during'?'flash':leapInfo.status==='before'?'warning':'checkmark',
size:20,color:"white"}
)}
),
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flex:1},children:[
(0,_jsxRuntime.jsxs)(_Typography.Typography,{style:{fontSize:15,fontFamily:'Nunito_900Black',color:'#1A1A2E'},variant:"body",weight:"black",children:["\u0421\u043A\u0430\u0447\u043E\u043A ",
leapInfo.leapNumber,": \xAB",leapInfo.leap.nameRu,"\xBB"]}
),
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:12,fontFamily:'Nunito_700Bold',color:'#6B6B80'},variant:"body",weight:"bold",children:
leapInfo.status==='during'?'В процессе':leapInfo.status==='before'?`Через ~${leapInfo.daysUntilStart} дн`:'Завершён ✓'}
)]}
)]}
),

leapInfo.status==='during'&&leapInfo.progressPct!==null&&
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{marginBottom:12},children:[
(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{style:{height:8,borderRadius:4,backgroundColor:'#F0ECE8'},children:
(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{style:{height:'100%',borderRadius:4,backgroundColor:'#F59E0B',width:`${Math.max(1,leapInfo.progressPct)}%`}})}
),
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:11,fontFamily:'Nunito_800ExtraBold',color:'#92400E',marginTop:4},variant:"body",weight:"extraBold",children:
leapInfo.progressPct===0?'< 1% пройдено':`${leapInfo.progressPct}% пройдено`}
)]}
),


leapInfo.warning&&
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:13,fontFamily:'Nunito_600SemiBold',color:'#475569',lineHeight:20},variant:"body",weight:"semiBold",children:
leapInfo.warning}
),


leapInfo.status==='during'&&
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{marginTop:12},children:[
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:11,fontFamily:'Nunito_800ExtraBold',color:'#8A8A9E',textTransform:'uppercase',letterSpacing:0.5},variant:"body",weight:"extraBold",children:"\u0422\u0418\u041F\u0418\u0427\u041D\u042B\u0415 \u0421\u0418\u041C\u041F\u0422\u041E\u041C\u042B"}

),
(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{style:{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:8},children:
leapInfo.leap.symptoms.map(function(s,i){return(
(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{style:{paddingHorizontal:12,paddingVertical:6,borderRadius:12,backgroundColor:'#FEF3C7'},children:
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:11,fontFamily:'Nunito_700Bold',color:'#92400E'},variant:"body",weight:"bold",children:s})},i
));}
)}
)]}
),


leapInfo.leap.parentTips.length>0&&
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{marginTop:12},children:[
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:11,fontFamily:'Nunito_800ExtraBold',color:'#8A8A9E',textTransform:'uppercase',letterSpacing:0.5},variant:"body",weight:"extraBold",children:"\u0427\u0422\u041E \u0414\u0415\u041B\u0410\u0422\u042C"}

),
leapInfo.leap.parentTips.map(function(tip,i){return(
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flexDirection:'row',alignItems:'flex-start',gap:8,marginTop:6},children:[
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{color:'#4DBFAA',marginTop:2},variant:"body",children:"\u2713"}),
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:12,fontFamily:'Nunito_600SemiBold',color:'#475569',lineHeight:18,flex:1},variant:"body",weight:"semiBold",children:tip})]},i
));}
)]}
)]}

),



(0,_jsxRuntime.jsxs)(_Surface.Surface,{style:[{shadowColor:"#000",shadowOffset:{width:0,height:4},shadowOpacity:0.04,shadowRadius:16,elevation:2},{padding:20}],bg:"white",radius:"xxl",variant:"elevated",borderWidth:1,borderColor:"#F0ECE8",children:[
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:16},children:[
(0,_jsxRuntime.jsx)(_vectorIcons.Ionicons,{name:"trending-up",size:18,color:"#8B5CF6"}),
(0,_jsxRuntime.jsxs)(_Typography.Typography,{style:{fontSize:16,fontFamily:'Nunito_900Black',color:'#1A1A2E'},variant:"body",weight:"black",children:["\u041D\u043E\u0440\u043C\u044B \u0434\u043B\u044F ",norms.ageLabel]})]}
),
(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{style:{flexDirection:'row',flexWrap:'wrap',gap:12},children:
[
{label:'СОН/СУТКИ',value:`${norms.totalSleepH} ч`,icon:'💤',bg:'#F3E8FF'},
{label:'ОКНО БОДР.',value:`${norms.wakeWindowMin[0]}–${norms.wakeWindowMin[1]} мин`,icon:'⏱',bg:'#FEF3C7'},
{label:'СНОВ/ДЕНЬ',value:norms.napsCount,icon:'🛏',bg:'#DBEAFE'},
{label:'КОРМЛЕНИЙ',value:norms.feedsPerDay,icon:'🍼',bg:'#D1FAE5'}].
map(function(item,i){return(
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{width:(SCREEN_WIDTH-72)/2,padding:12,borderRadius:16,backgroundColor:item.bg},children:[
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:10,fontFamily:'Nunito_800ExtraBold',color:'#6B6B80',textTransform:'uppercase'},variant:"body",weight:"extraBold",children:item.label}),
(0,_jsxRuntime.jsxs)(_Typography.Typography,{style:{fontSize:16,fontFamily:'Nunito_900Black',color:'#1A1A2E',marginTop:2},variant:"body",weight:"black",children:[item.icon," ",item.value]})]},i
));}
)}
),

(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:11,fontFamily:'Nunito_800ExtraBold',color:'#8A8A9E',textTransform:'uppercase',letterSpacing:0.5,marginTop:16,marginBottom:8},variant:"body",weight:"extraBold",children:"\u0420\u0415\u041A\u041E\u041C\u0415\u041D\u0414\u0410\u0426\u0418\u0418 \u0414\u041B\u042F \u042D\u0422\u041E\u0413\u041E \u0412\u041E\u0417\u0420\u0410\u0421\u0422\u0410"}

),
norms.specificActions.map(function(action,i){return(
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flexDirection:'row',alignItems:'center',gap:8,padding:10,borderRadius:12,backgroundColor:'#F8FAFC',marginBottom:8},children:[
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{color:'#8B5CF6',fontSize:12,fontFamily:'Nunito_900Black'},variant:"body",weight:"black",children:"\u2022"}),
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:13,fontFamily:'Nunito_700Bold',color:'#334155',flex:1},variant:"body",weight:"bold",children:action})]},i
));}
),

norms.alerts.length>0&&
(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{style:{gap:8,marginTop:12},children:
norms.alerts.map(function(alert,i){return(
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flexDirection:'row',alignItems:'flex-start',gap:8,padding:12,borderRadius:12,backgroundColor:'#FFF7ED',borderWidth:1,borderColor:'#FDBA74'},children:[
(0,_jsxRuntime.jsx)(_vectorIcons.Ionicons,{name:"warning",size:16,color:"#F97316",style:{marginTop:2}}),
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:12,fontFamily:'Nunito_700Bold',color:'#9A3412',flex:1,lineHeight:18},variant:"body",weight:"bold",children:alert})]},i
));}
)}
)]}

),


(0,_jsxRuntime.jsxs)(_Surface.Surface,{style:[{shadowColor:"#000",shadowOffset:{width:0,height:4},shadowOpacity:0.04,shadowRadius:16,elevation:2},{padding:20}],bg:"white",radius:"xxl",variant:"elevated",borderWidth:1,borderColor:"#F0ECE8",children:[
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:16},children:[
(0,_jsxRuntime.jsx)(_lucideReactNative.Sparkles,{size:18,color:"#F59E0B"}),
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:16,fontFamily:'Nunito_900Black',color:'#1A1A2E'},variant:"body",weight:"black",children:"\u0410\u043D\u0430\u043B\u0438\u0437 \u043D\u0435\u0434\u0435\u043B\u0438"})]}
),
adaptations.map(function(a,i){return(
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flexDirection:'row',alignItems:'flex-start',gap:10,padding:12,borderRadius:12,backgroundColor:'#FAFBFC',marginBottom:10},children:[
(0,_jsxRuntime.jsx)(_vectorIcons.Ionicons,{name:"information-circle",size:15,color:"#6366F1",style:{marginTop:2}}),
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:13,fontFamily:'Nunito_600SemiBold',color:'#334155',lineHeight:20,flex:1},variant:"body",weight:"semiBold",children:a})]},i
));}
)]}
),


(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{style:{flexDirection:'row',flexWrap:'wrap',gap:8,paddingBottom:16},children:
sources.map(function(s,i){return(
(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{style:{paddingHorizontal:10,paddingVertical:4,borderRadius:8,backgroundColor:'#F1F5F9'},children:
(0,_jsxRuntime.jsxs)(_Typography.Typography,{style:{fontSize:10,fontFamily:'Nunito_800ExtraBold',color:'#64748B'},variant:"body",weight:"extraBold",children:["\uD83D\uDCDA ",s]})},i
));}
)}
)]}
));

};




var EngineSchedule=function EngineSchedule(_ref2)




{var schedule=_ref2.schedule,leapInfo=_ref2.leapInfo,norms=_ref2.norms,wakeUpTime=_ref2.wakeUpTime,onChangeWakeUp=_ref2.onChangeWakeUp;
var _useState=(0,_react.useState)(false),_useState2=(0,_slicedToArray2.default)(_useState,2),showTimePicker=_useState2[0],setShowTimePicker=_useState2[1];

var handleTimeChange=function handleTimeChange(event,selectedDate){
if(_reactNative.Platform.OS==='android')setShowTimePicker(false);
if(selectedDate){
var h=selectedDate.getHours().toString().padStart(2,'0');
var m=selectedDate.getMinutes().toString().padStart(2,'0');
onChangeWakeUp(`${h}:${m}`);
}
};


var curDate=new Date();
var _wakeUpTime$split$map=wakeUpTime.split(':').map(Number),_wakeUpTime$split$map2=(0,_slicedToArray2.default)(_wakeUpTime$split$map,2),hh=_wakeUpTime$split$map2[0],mm=_wakeUpTime$split$map2[1];
curDate.setHours(hh);curDate.setMinutes(mm);curDate.setSeconds(0);

return(
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{children:[

(0,_jsxRuntime.jsxs)(_Surface.Surface,{style:[{shadowColor:"#000",shadowOffset:{width:0,height:4},shadowOpacity:0.04,shadowRadius:16,elevation:2},{padding:16,marginBottom:16}],bg:"white",radius:"xxl",variant:"elevated",borderWidth:1,borderColor:"#F0ECE8",children:[
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},children:[
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{children:[
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:14,fontFamily:'Nunito_900Black',color:'#1A1A2E'},variant:"body",weight:"black",children:"\u2600\uFE0F \u0412\u0440\u0435\u043C\u044F \u043F\u043E\u0434\u044A\u0451\u043C\u0430"}),
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:11,fontFamily:'Nunito_700Bold',color:'#8A8A9E'},variant:"body",weight:"bold",children:"\u0412\u0435\u0441\u044C \u043F\u043B\u0430\u043D \u0441\u0442\u0440\u043E\u0438\u0442\u0441\u044F \u043E\u0442 \u044D\u0442\u043E\u0433\u043E \u0432\u0440\u0435\u043C\u0435\u043D\u0438"})]}
),
(0,_jsxRuntime.jsx)(_reactNative.TouchableOpacity,{onPress:function onPress(){return setShowTimePicker(true);},children:
(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{style:{backgroundColor:'#F3E8FF',borderWidth:2,borderColor:'#8B5CF6',borderRadius:14,paddingHorizontal:14,paddingVertical:10},children:
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:18,fontFamily:'Nunito_900Black',color:'#8B5CF6'},variant:"body",weight:"black",children:wakeUpTime})}
)}
)]}
),
(0,_jsxRuntime.jsx)(_DateTimePickerModal.default,{
visible:showTimePicker,
value:curDate,
mode:"time",
is24Hour:true,
onChange:function onChange(selectedDate){
if(selectedDate){
var h=selectedDate.getHours().toString().padStart(2,'0');
var m=selectedDate.getMinutes().toString().padStart(2,'0');
onChangeWakeUp(`${h}:${m}`);
}
},
onClose:function onClose(){return setShowTimePicker(false);}}
)]}
),


leapInfo.status==='during'&&
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flexDirection:'row',alignItems:'center',gap:8,padding:12,borderRadius:16,backgroundColor:'#FEF3C7',borderWidth:1,borderColor:'#FCD34D',marginBottom:16},children:[
(0,_jsxRuntime.jsx)(_vectorIcons.Ionicons,{name:"flash",size:16,color:"#F59E0B"}),
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:12,fontFamily:'Nunito_800ExtraBold',color:'#92400E',flex:1},variant:"body",weight:"extraBold",children:"\u041C\u044F\u0433\u043A\u0438\u0439 \u0440\u0435\u0436\u0438\u043C: \xB130 \u043C\u0438\u043D \u0433\u0438\u0431\u043A\u043E\u0441\u0442\u0438 \u043A \u043A\u0430\u0436\u0434\u043E\u043C\u0443 \u0431\u043B\u043E\u043A\u0443"})]}
),



(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{style:{flexDirection:'row',gap:8,marginBottom:16,flexWrap:'wrap'},children:
[
{icon:'🍼',label:'Кормление',bg:'#DBEAFE'},
{icon:'💤',label:'Сон',bg:'#F3E8FF'},
{icon:'🧸',label:'Активность',bg:'#ECFDF5'},
{icon:'🌙',label:'Ритуал/Ночь',bg:'#EDE4F8'}].
map(function(l){return(
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:8,paddingVertical:4,borderRadius:8,backgroundColor:l.bg},children:[
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:12},variant:"body",children:l.icon}),
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:10,fontFamily:'Nunito_800ExtraBold',color:'#475569'},variant:"body",weight:"extraBold",children:l.label})]},l.label
));}
)}
),


schedule.map(function(block,i){return(
(0,_jsxRuntime.jsx)(_Surface.Surface,{style:[{shadowColor:"#000",shadowOffset:{width:0,height:4},shadowOpacity:0.04,shadowRadius:16,elevation:2},{borderColor:block.isFlexible?'#FCD34D':'#F0ECE8',marginBottom:8,overflow:'hidden'}],bg:"white",radius:"xxl",variant:"elevated",borderWidth:1,borderColor:"#F0ECE8",children:
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flexDirection:'row'},children:[
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{alignItems:'center',justifyContent:'center',paddingHorizontal:12,paddingVertical:12,backgroundColor:block.color,minWidth:64},children:[
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:14,fontFamily:'Nunito_900Black',color:'#334155'},variant:"body",weight:"black",children:block.time}),
block.durationMin>0&&
(0,_jsxRuntime.jsxs)(_Typography.Typography,{style:{fontSize:10,fontFamily:'Nunito_800ExtraBold',color:'#6B6B80'},variant:"body",weight:"extraBold",children:[block.durationMin,"\u043C"]}),

block.isFlexible&&(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:9,fontFamily:'Nunito_800ExtraBold',color:'#F59E0B'},variant:"body",weight:"extraBold",children:"\xB130\u043C"})]}
),
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flex:1,padding:12},children:[
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flexDirection:'row',alignItems:'center',gap:8},children:[
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:18},variant:"body",children:block.icon}),
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:14,fontFamily:'Nunito_900Black',color:'#1A1A2E'},variant:"body",weight:"black",children:block.activity})]}
),
(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{style:{flexDirection:'row',flexWrap:'wrap',gap:4,marginTop:8},children:
block.actions.map(function(a,j){return(
(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{style:{paddingHorizontal:8,paddingVertical:2,borderRadius:6,backgroundColor:'#F8FAFC'},children:
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:10,fontFamily:'Nunito_700Bold',color:'#6B6B80'},variant:"body",weight:"bold",children:a})},j
));}
)}
)]}
)]}
)},i
));}
),


(0,_jsxRuntime.jsx)(_Surface.Surface,{style:[{shadowColor:"#000",shadowOffset:{width:0,height:4},shadowOpacity:0.04,shadowRadius:16,elevation:2},{padding:16,marginTop:8}],bg:"white",radius:"xxl",variant:"elevated",borderWidth:1,borderColor:"#F0ECE8",children:
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flexDirection:'row',alignItems:'flex-start',gap:12},children:[
(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{style:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:'#F3E8FF'},children:
(0,_jsxRuntime.jsx)(_vectorIcons.Ionicons,{name:"time",size:20,color:"#8B5CF6"})}
),
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flex:1},children:[
(0,_jsxRuntime.jsxs)(_Typography.Typography,{style:{fontSize:13,fontFamily:'Nunito_800ExtraBold',color:'#1A1A2E',marginBottom:4},variant:"body",weight:"extraBold",children:["\u041E\u043A\u043D\u0430 \u0431\u043E\u0434\u0440\u0441\u0442\u0432\u043E\u0432\u0430\u043D\u0438\u044F: ",
norms.wakeWindowMin[0],"\u2013",norms.wakeWindowMin[1]," \u043C\u0438\u043D"]}
),
(0,_jsxRuntime.jsxs)(_Typography.Typography,{style:{fontSize:12,fontFamily:'Nunito_600SemiBold',color:'#6B6B80',lineHeight:18},variant:"body",weight:"semiBold",children:["\u0420\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043D\u043E \u043E\u0442 \u0432\u0440\u0435\u043C\u0435\u043D\u0438 \u043F\u043E\u0434\u044A\u0451\u043C\u0430 \u0441 \u0443\u0447\u0451\u0442\u043E\u043C \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u043E\u043A\u043E\u043D \u0431\u043E\u0434\u0440\u0441\u0442\u0432\u043E\u0432\u0430\u043D\u0438\u044F (",
norms.ageLabel,")."]}
)]}
)]}
)}
)]}
));

};




var RitualChecklist=function RitualChecklist(_ref3)







{var ritual=_ref3.ritual,log=_ref3.log,onCompleteStep=_ref3.onCompleteStep,onFinish=_ref3.onFinish,onBack=_ref3.onBack,anchorPhrase=_ref3.anchorPhrase;
var _useState3=(0,_react.useState)({}),_useState4=(0,_slicedToArray2.default)(_useState3,2),stepTimers=_useState4[0],setStepTimers=_useState4[1];
var intervalRefs=(0,_react.useRef)({});
var _useState5=(0,_react.useState)(null),_useState6=(0,_slicedToArray2.default)(_useState5,2),activeStep=_useState6[0],setActiveStep=_useState6[1];

var toggleTimer=function toggleTimer(stepId){
if(activeStep===stepId){
clearInterval(intervalRefs.current[stepId]);
delete intervalRefs.current[stepId];
setActiveStep(null);
}else{
if(activeStep&&intervalRefs.current[activeStep]){
clearInterval(intervalRefs.current[activeStep]);
delete intervalRefs.current[activeStep];
}
setActiveStep(stepId);
intervalRefs.current[stepId]=setInterval(function(){
setStepTimers(function(prev){return Object.assign({},prev,(0,_defineProperty2.default)({},stepId,(prev[stepId]||0)+1));});
},1000);
}
};

(0,_react.useEffect)(function(){return function(){Object.values(intervalRefs.current).forEach(clearInterval);};},[]);

var allDone=log.completedSteps.length===ritual.steps.length;
var progressPct=ritual.steps.length>0?Math.round(log.completedSteps.length/ritual.steps.length*100):0;
var fmtTimer=function fmtTimer(secs){return`${Math.floor(secs/60).toString().padStart(2,'0')}:${(secs%60).toString().padStart(2,'0')}`;};

return(
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{children:[
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:16},children:[
(0,_jsxRuntime.jsx)(_reactNative.TouchableOpacity,{onPress:onBack,style:{padding:8,borderRadius:12,backgroundColor:'#F5F5F9'},children:
(0,_jsxRuntime.jsx)(_vectorIcons.Ionicons,{name:"chevron-back",size:20,color:"#6B6B80"})}
),
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flex:1},children:[
(0,_jsxRuntime.jsxs)(_Typography.Typography,{style:{fontSize:22,fontFamily:'Nunito_900Black',color:'#1A1A2E'},variant:"body",weight:"black",children:[ritual.emoji," ",ritual.name]}),
(0,_jsxRuntime.jsxs)(_Typography.Typography,{style:{fontSize:13,fontFamily:'Nunito_700Bold',color:'#8A8A9E'},variant:"body",weight:"bold",children:[log.completedSteps.length," \u0438\u0437 ",ritual.steps.length," \u0448\u0430\u0433\u043E\u0432"]})]}
)]}
),


(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{marginBottom:20},children:[
(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{style:{height:10,borderRadius:5,backgroundColor:'#F0ECE8',overflow:'hidden'},children:
(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{style:{height:'100%',borderRadius:5,width:`${progressPct}%`,backgroundColor:allDone?'#4DBFAA':'#8B5CF6'}})}
),
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flexDirection:'row',justifyContent:'space-between',marginTop:6},children:[
(0,_jsxRuntime.jsxs)(_Typography.Typography,{style:{fontSize:11,fontFamily:'Nunito_800ExtraBold',color:'#8A8A9E'},variant:"body",weight:"extraBold",children:[progressPct,"%"]}),
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:11,fontFamily:'Nunito_800ExtraBold',color:allDone?'#4DBFAA':'#8A8A9E'},variant:"body",weight:"extraBold",children:
allDone?'✨ Готово!':'В процессе...'}
)]}
)]}
),


ritual.steps.map(function(step,i){
var done=log.completedSteps.includes(step.id);
var isActive=activeStep===step.id;
var timerSec=stepTimers[step.id]||0;

return(
(0,_jsxRuntime.jsx)(_Surface.Surface,{style:[{shadowColor:"#000",shadowOffset:{width:0,height:4},shadowOpacity:0.04,shadowRadius:16,elevation:2},{
borderColor:isActive?'#8B5CF6':done?'rgba(77,191,170,0.25)':'#F0ECE8',
backgroundColor:done?'#F0FDF9':isActive?'#FAF5FF':'#FFFFFF',
padding:16,marginBottom:12
}],bg:"white",radius:"xxl",variant:"elevated",borderWidth:1,borderColor:"#F0ECE8",children:
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flexDirection:'row',alignItems:'center',gap:12},children:[
(0,_jsxRuntime.jsx)(_reactNative.TouchableOpacity,{
onPress:function onPress(){return onCompleteStep(log.id,step.id);},
style:{
width:36,height:36,borderRadius:12,alignItems:'center',justifyContent:'center',
backgroundColor:done?'#4DBFAA':'#F5F5F9'
},children:

done?
(0,_jsxRuntime.jsx)(_vectorIcons.Ionicons,{name:"checkmark",size:18,color:"white"}):

(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:14,fontFamily:'Nunito_900Black',color:'#8A8A9E'},variant:"body",weight:"black",children:i+1})}

),
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flex:1},children:[
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flexDirection:'row',alignItems:'center',gap:8},children:[
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:20},variant:"body",children:step.icon}),
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{
fontSize:15,fontFamily:'Nunito_800ExtraBold',
color:done?'#8A8A9E':'#1A1A2E',
textDecorationLine:done?'line-through':'none'
},variant:"body",weight:"extraBold",children:step.label})]}
),
(0,_jsxRuntime.jsxs)(_Typography.Typography,{style:{fontSize:11,fontFamily:'Nunito_700Bold',color:'#6B6B80',marginTop:2},variant:"body",weight:"bold",children:["\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u043E\u0432\u0430\u043D\u043E: ",
step.durationMin," \u043C\u0438\u043D"]}
)]}
),
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flexDirection:'row',alignItems:'center',gap:8},children:[
timerSec>0&&
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:14,fontFamily:'Nunito_900Black',color:isActive?'#8B5CF6':'#6B6B80'},variant:"body",weight:"black",children:
fmtTimer(timerSec)}
),

(0,_jsxRuntime.jsx)(_reactNative.TouchableOpacity,{
onPress:function onPress(){return toggleTimer(step.id);},
style:{
width:36,height:36,borderRadius:12,alignItems:'center',justifyContent:'center',
backgroundColor:isActive?'#8B5CF6':'#F5F3FF'
},children:

(0,_jsxRuntime.jsx)(_vectorIcons.Ionicons,{name:isActive?'pause':'timer-outline',size:16,color:isActive?'white':'#8B5CF6'})}
)]}
)]}
)},step.id
));

}),


anchorPhrase&&
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{marginTop:16,padding:16,borderRadius:16,alignItems:'center',backgroundColor:'#F0EEFF',borderWidth:1,borderStyle:'solid',borderColor:'rgba(196, 181, 253, 0.3)'},children:[
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:11,fontFamily:'Nunito_800ExtraBold',color:'#8B5CF6',textTransform:'uppercase',letterSpacing:0.5},variant:"body",weight:"extraBold",children:"\u0424\u0420\u0410\u0417\u0410-\u042F\u041A\u041E\u0420\u042C"}),
(0,_jsxRuntime.jsxs)(_Typography.Typography,{style:{fontSize:16,fontFamily:'Nunito_900Black',color:'#5B21B6',marginTop:4},variant:"body",weight:"black",children:["\xAB",anchorPhrase,"\xBB"]})]}
),


allDone&&
(0,_jsxRuntime.jsx)(_reactNative.TouchableOpacity,{onPress:function onPress(){return onFinish(log.id);},style:{marginTop:24,height:56,borderRadius:20,alignItems:'center',justifyContent:'center',backgroundColor:'#4DBFAA',shadowColor:'#4DBFAA',shadowOffset:{width:0,height:8},shadowOpacity:0.35,shadowRadius:24},children:
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:16,fontFamily:'Nunito_900Black',color:'white'},variant:"body",weight:"black",children:"\u2728 \u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044C \u0440\u0438\u0442\u0443\u0430\u043B"})}
)]}

));

};





var RitualEditor=function RitualEditor(_ref4)



{var initial=_ref4.initial,onSave=_ref4.onSave,onBack=_ref4.onBack,onDelete=_ref4.onDelete;
var _useState7=(0,_react.useState)((initial==null?void 0:initial.name)||""),_useState8=(0,_slicedToArray2.default)(_useState7,2),name=_useState8[0],setName=_useState8[1];
var _useState9=(0,_react.useState)((initial==null?void 0:initial.emoji)||"🌙"),_useState0=(0,_slicedToArray2.default)(_useState9,2),emoji=_useState0[0],setEmoji=_useState0[1];
var _useState1=(0,_react.useState)((initial==null?void 0:initial.steps)||[]),_useState10=(0,_slicedToArray2.default)(_useState1,2),steps=_useState10[0],setSteps=_useState10[1];
var emojiOptions=["🌙","⚡","🧖","🌟","💤","🎵","🛁","🧸","☀️"];

var addStep=function addStep(ps){return setSteps(function(prev){return[].concat((0,_toConsumableArray2.default)(prev),[Object.assign({},ps,{id:`step-${Date.now()}-${Math.random().toString(36).slice(2,6)}`})]);});};
var removeStep=function removeStep(id){return setSteps(function(prev){return prev.filter(function(s){return s.id!==id;});});};
var moveStep=function moveStep(from,to){
if(to<0||to>=steps.length)return;
var arr=(0,_toConsumableArray2.default)(steps);var _arr$splice=arr.splice(from,1),_arr$splice2=(0,_slicedToArray2.default)(_arr$splice,1),item=_arr$splice2[0];arr.splice(to,0,item);setSteps(arr);
};

var isValid=name.trim().length>0&&steps.length>0;

return(
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{children:[
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:20},children:[
(0,_jsxRuntime.jsx)(_reactNative.TouchableOpacity,{onPress:onBack,style:{padding:8,borderRadius:12,backgroundColor:'#F5F5F9'},children:
(0,_jsxRuntime.jsx)(_vectorIcons.Ionicons,{name:"chevron-back",size:20,color:"#6B6B80"})}
),
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:22,fontFamily:'Nunito_900Black',color:'#1A1A2E'},variant:"body",weight:"black",children:
initial?"Редактировать":"Новый ритуал"}
)]}
),

(0,_jsxRuntime.jsxs)(_Surface.Surface,{style:[{shadowColor:"#000",shadowOffset:{width:0,height:4},shadowOpacity:0.04,shadowRadius:16,elevation:2},{padding:16,marginBottom:16}],bg:"white",radius:"xxl",variant:"elevated",borderWidth:1,borderColor:"#F0ECE8",children:[
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:12,fontFamily:'Nunito_800ExtraBold',color:'#8A8A9E',textTransform:'uppercase',letterSpacing:0.5,marginBottom:8},variant:"body",weight:"extraBold",children:"\u041D\u0410\u0417\u0412\u0410\u041D\u0418\u0415"}),
(0,_jsxRuntime.jsx)(_reactNative.TextInput,{
value:name,
onChangeText:setName,
placeholder:"\u041D\u0430\u043F\u0440. \u0423\u0442\u0440\u0435\u043D\u043D\u0438\u0439 \u0440\u0438\u0442\u0443\u0430\u043B",
placeholderTextColor:"#94A3B8",
style:{backgroundColor:'#F8FAFC',borderWidth:1,borderColor:'#E2E8F0',borderRadius:14,paddingHorizontal:16,paddingVertical:14,fontSize:16,fontFamily:'Nunito_800ExtraBold',color:'#1A1A2E'}}
),

(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:12,fontFamily:'Nunito_800ExtraBold',color:'#8A8A9E',textTransform:'uppercase',letterSpacing:0.5,marginTop:16,marginBottom:8},variant:"body",weight:"extraBold",children:"\u0418\u041A\u041E\u041D\u041A\u0410"}),
(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{style:{flexDirection:'row',flexWrap:'wrap',gap:8},children:
emojiOptions.map(function(e){return(
(0,_jsxRuntime.jsx)(_reactNative.TouchableOpacity,{

onPress:function onPress(){return setEmoji(e);},
style:{
width:44,height:44,borderRadius:12,alignItems:'center',justifyContent:'center',
backgroundColor:emoji===e?'rgba(139,92,246,0.2)':'#F5F5F9',
borderWidth:2,borderColor:emoji===e?'#8B5CF6':'transparent'
},children:

(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:22},variant:"body",children:e})},e
));}
)}
)]}
),

(0,_jsxRuntime.jsxs)(_Surface.Surface,{style:[{shadowColor:"#000",shadowOffset:{width:0,height:4},shadowOpacity:0.04,shadowRadius:16,elevation:2},{padding:16,marginBottom:16}],bg:"white",radius:"xxl",variant:"elevated",borderWidth:1,borderColor:"#F0ECE8",children:[
(0,_jsxRuntime.jsxs)(_Typography.Typography,{style:{fontSize:12,fontFamily:'Nunito_800ExtraBold',color:'#8A8A9E',textTransform:'uppercase',letterSpacing:0.5,marginBottom:12},variant:"body",weight:"extraBold",children:["\u0428\u0410\u0413\u0418 (",
steps.length,")"]}
),
steps.length===0?
(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{style:{paddingVertical:20,alignItems:'center'},children:
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:13,fontFamily:'Nunito_600SemiBold',color:'#6B6B80'},variant:"body",weight:"semiBold",children:"\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0448\u0430\u0433\u0438 \u0438\u0437 \u043F\u0430\u043B\u0438\u0442\u0440\u044B \u043D\u0438\u0436\u0435"})}
):

(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{style:{gap:8},children:
steps.map(function(step,i){return(
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flexDirection:'row',alignItems:'center',backgroundColor:'#F8FAFC',borderRadius:12,padding:12},children:[
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flexDirection:'column',gap:4,marginRight:8},children:[
(0,_jsxRuntime.jsx)(_reactNative.TouchableOpacity,{onPress:function onPress(){return moveStep(i,i-1);},children:(0,_jsxRuntime.jsx)(_vectorIcons.Ionicons,{name:"chevron-up",size:16,color:"#6B6B80"})}),
(0,_jsxRuntime.jsx)(_reactNative.TouchableOpacity,{onPress:function onPress(){return moveStep(i,i+1);},children:(0,_jsxRuntime.jsx)(_vectorIcons.Ionicons,{name:"chevron-down",size:16,color:"#6B6B80"})})]}
),
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:20,marginRight:8},variant:"body",children:step.icon}),
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{flex:1,fontSize:14,fontFamily:'Nunito_800ExtraBold',color:'#1A1A2E'},variant:"body",weight:"extraBold",children:step.label}),
(0,_jsxRuntime.jsxs)(_Typography.Typography,{style:{fontSize:12,fontFamily:'Nunito_700Bold',color:'#8A8A9E',marginRight:8},variant:"body",weight:"bold",children:[step.durationMin,"\u043C"]}),
(0,_jsxRuntime.jsx)(_reactNative.TouchableOpacity,{onPress:function onPress(){return removeStep(step.id);},style:{padding:4},children:
(0,_jsxRuntime.jsx)(_vectorIcons.Ionicons,{name:"close-circle",size:20,color:"#E05A5A"})}
)]},step.id
));}
)}
)]}

),

(0,_jsxRuntime.jsxs)(_Surface.Surface,{style:[{shadowColor:"#000",shadowOffset:{width:0,height:4},shadowOpacity:0.04,shadowRadius:16,elevation:2},{padding:16,marginBottom:24}],bg:"white",radius:"xxl",variant:"elevated",borderWidth:1,borderColor:"#F0ECE8",children:[
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:12,fontFamily:'Nunito_800ExtraBold',color:'#8A8A9E',textTransform:'uppercase',letterSpacing:0.5,marginBottom:12},variant:"body",weight:"extraBold",children:"\u0414\u041E\u0411\u0410\u0412\u0418\u0422\u042C \u0428\u0410\u0413"}),
(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{style:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:8},children:
_useRituals2.STEP_PALETTE.map(function(ps){return(
(0,_jsxRuntime.jsxs)(_reactNative.TouchableOpacity,{

onPress:function onPress(){return addStep(ps);},
style:{width:'31%',alignItems:'center',paddingVertical:12,paddingHorizontal:4,borderRadius:14,borderWidth:1,borderColor:'#E2E8F0',backgroundColor:'#F8FAFC',marginBottom:8},children:[

(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:22,marginBottom:4},variant:"body",children:ps.icon}),
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:10,fontFamily:'Nunito_800ExtraBold',color:'#6B6B80',textAlign:'center',lineHeight:12},variant:"body",weight:"extraBold",children:ps.label})]},ps.id
));}
)}
)]}
),

(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flexDirection:'row',gap:12,marginBottom:40},children:[
onDelete&&
(0,_jsxRuntime.jsx)(_reactNative.TouchableOpacity,{
onPress:onDelete,
style:{width:52,height:52,borderRadius:16,backgroundColor:'#FFE4E4',alignItems:'center',justifyContent:'center'},children:

(0,_jsxRuntime.jsx)(_vectorIcons.Ionicons,{name:"trash",size:20,color:"#E05A5A"})}
),

(0,_jsxRuntime.jsx)(_reactNative.TouchableOpacity,{
disabled:!isValid,
onPress:function onPress(){
if(isValid){
onSave({name:name.trim(),emoji:emoji,steps:steps});
}
},
style:{
flex:1,height:52,borderRadius:16,alignItems:'center',justifyContent:'center',
backgroundColor:isValid?'#8B5CF6':'#E2E8F0',
shadowColor:isValid?'#8B5CF6':'transparent',shadowOffset:{width:0,height:8},shadowOpacity:isValid?0.3:0,shadowRadius:24
},children:

(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:15,fontFamily:'Nunito_900Black',color:isValid?'white':'#94A3B8'},variant:"body",weight:"black",children:
initial?"Сохранить":"Создать ритуал"}
)}
)]}
)]}

));

};




var RoutineScreen=function RoutineScreen(){
var baby=(0,_authStore.useAuthStore)(function(s){return s.baby;});
var _useState11=(0,_react.useState)([]),_useState12=(0,_slicedToArray2.default)(_useState11,2),sleeps=_useState12[0],setSleeps=_useState12[1];

(0,_react.useEffect)(function(){
_db.database.get('sleeps').query().fetch().then(setSleeps).catch(function(){return setSleeps([]);});
},[]);
var _useRituals=


(0,_useRituals2.useRituals)(),rituals=_useRituals.rituals,logs=_useRituals.logs,addRitual=_useRituals.addRitual,updateRitual=_useRituals.updateRitual,deleteRitual=_useRituals.deleteRitual,startRitual=_useRituals.startRitual,completeStep=_useRituals.completeStep,finishRitual=_useRituals.finishRitual,getCompletionRate=_useRituals.getCompletionRate,getLastLog=_useRituals.getLastLog;

var _useState13=(0,_react.useState)('07:00'),_useState14=(0,_slicedToArray2.default)(_useState13,2),wakeUpTime=_useState14[0],setWakeUpTime=_useState14[1];
var engine=(0,_useRoutineEngine.useRoutineEngine)(baby==null?void 0:baby.birthdate,baby==null?void 0:baby.name,sleeps,wakeUpTime);

var _useState15=(0,_react.useState)('status'),_useState16=(0,_slicedToArray2.default)(_useState15,2),activeSubTab=_useState16[0],setActiveSubTab=_useState16[1];
var _useState17=(0,_react.useState)('list'),_useState18=(0,_slicedToArray2.default)(_useState17,2),view=_useState18[0],setView=_useState18[1];
var _useState19=(0,_react.useState)(null),_useState20=(0,_slicedToArray2.default)(_useState19,2),activeLog=_useState20[0],setActiveLog=_useState20[1];
var _useState21=(0,_react.useState)(null),_useState22=(0,_slicedToArray2.default)(_useState21,2),activeRitual=_useState22[0],setActiveRitual=_useState22[1];
var _useState23=(0,_react.useState)(null),_useState24=(0,_slicedToArray2.default)(_useState23,2),editingRitual=_useState24[0],setEditingRitual=_useState24[1];

var _useState25=(0,_react.useState)(false),_useState26=(0,_slicedToArray2.default)(_useState25,2),refreshing=_useState26[0],setRefreshing=_useState26[1];
var onRefresh=_react.default.useCallback((0,_asyncToGenerator2.default)(function*(){
setRefreshing(true);
try{
var _yield$import=yield import('../db/sync'),syncWithSupabase=_yield$import.syncWithSupabase;
yield syncWithSupabase(true);

var newSleeps=yield _db.database.get('sleeps').query().fetch();
setSleeps(newSleeps);
}catch(e){
if(__DEV__)console.warn("Manual sync error",e);
}finally{
setRefreshing(false);
}
}),[]);

var pagerRef=(0,_react.useRef)(null);
var handleTabPress=function handleTabPress(tab,index){var _pagerRef$current;
setActiveSubTab(tab);
(_pagerRef$current=pagerRef.current)==null||_pagerRef$current.setPage(index);
};

var completionRate=getCompletionRate(7);


var engineBedtimeRitual={
id:'engine-bedtime',
name:`Вечерний (${engine.bedtimeRitual.ageRange})`,
emoji:'🌙',
isPreset:true,
steps:engine.bedtimeRitual.steps
};
var engineMorningRitual={
id:'engine-morning',
name:'Утренний ритуал',
emoji:'☀️',
isPreset:true,
steps:engine.morningRitual.steps
};
var allRituals=[engineBedtimeRitual,engineMorningRitual].concat((0,_toConsumableArray2.default)(rituals.filter(function(r){return!r.id.startsWith('preset-')&&!r.id.startsWith('engine-');})));

var handleStartRitual=function handleStartRitual(ritual){
var log=startRitual(ritual.id);
setActiveLog(log);
setActiveRitual(ritual);
setView('checklist');
};

var handleFinishRitual=function handleFinishRitual(logId){
finishRitual(logId);
setView('list');
setActiveLog(null);
setActiveRitual(null);
};

var handleSaveRitual=function handleSaveRitual(data){
if(editingRitual)updateRitual(editingRitual.id,data);else
addRitual(data);
setEditingRitual(null);setView('list');
};

var handleDeleteRitual=function handleDeleteRitual(){
if(editingRitual){
deleteRitual(editingRitual.id);
setEditingRitual(null);
setView('list');
}
};

return(
(0,_jsxRuntime.jsxs)(_reactNative.KeyboardAvoidingView,{style:{flex:1,backgroundColor:'#FAFBFC'},behavior:_reactNative.Platform.OS==='ios'?'padding':undefined,children:[
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{paddingHorizontal:16,paddingTop:_reactNative.Platform.OS==='ios'?60:16},children:[
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:32,fontFamily:'Nunito_900Black',color:'#0F172A',letterSpacing:-0.5,marginBottom:4},variant:"body",weight:"black",children:"\u0420\u0435\u0436\u0438\u043C"}),
(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{style:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:16},children:
engine.leapInfo.status==='during'?
(0,_jsxRuntime.jsxs)(_jsxRuntime.Fragment,{children:[
(0,_jsxRuntime.jsx)(_lucideReactNative.Zap,{size:16,color:"#F59E0B"}),
(0,_jsxRuntime.jsxs)(_Typography.Typography,{style:{fontSize:15,fontFamily:'Nunito_700Bold',color:'#6B6B80'},variant:"body",weight:"bold",children:["\u0421\u043A\u0430\u0447\u043E\u043A ",
engine.leapInfo.leapNumber," \u2014 \u043C\u044F\u0433\u043A\u0438\u0439 \u0440\u0435\u0436\u0438\u043C"]}
)]}
):

(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:15,fontFamily:'Nunito_700Bold',color:'#6B6B80'},variant:"body",weight:"bold",children:"\u0420\u0438\u0442\u0443\u0430\u043B\u044B, \u043D\u043E\u0440\u043C\u044B \u0438 \u0440\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435"}

)}

),


view==='list'&&
(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{style:{flexDirection:'row',padding:4,marginBottom:20,borderRadius:100,backgroundColor:'#E2E8F0'},children:
[
{id:'status',label:'Статус',icon:_lucideReactNative.Baby},
{id:'rituals',label:'Ритуалы',icon:_lucideReactNative.Moon},
{id:'schedule',label:'План',icon:_lucideReactNative.CalendarDays}].
map(function(t,index){return(
(0,_jsxRuntime.jsxs)(_reactNative.TouchableOpacity,{

onPress:function onPress(){return handleTabPress(t.id,index);},
style:Object.assign({
flex:1,flexDirection:'row',gap:6,paddingVertical:10,borderRadius:100,alignItems:'center',justifyContent:'center',
backgroundColor:activeSubTab===t.id?'#FFFFFF':'transparent'},
activeSubTab===t.id?{shadowColor:'#000',shadowOffset:{width:0,height:4},shadowOpacity:0.08,shadowRadius:12,elevation:4}:{}),children:[


(0,_jsxRuntime.jsx)(t.icon,{size:16,color:activeSubTab===t.id?'#0F172A':'#64748B',strokeWidth:activeSubTab===t.id?2:1.5}),
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{
fontSize:13,fontFamily:'Nunito_800ExtraBold',
color:activeSubTab===t.id?'#0F172A':'#64748B'
},variant:"body",weight:"extraBold",children:t.label})]},t.id
));}
)}
)]}

),

view==='list'?
(0,_jsxRuntime.jsxs)(_reactNativePagerView.default,{style:{flex:1},initialPage:0,ref:pagerRef,onPageSelected:function onPageSelected(e){
var p=['status','rituals','schedule'];
setActiveSubTab(p[e.nativeEvent.position]);
},children:[
(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{children:
(0,_jsxRuntime.jsx)(_reactNative.ScrollView,{
contentContainerStyle:{paddingHorizontal:16,paddingBottom:180},
showsVerticalScrollIndicator:false,
refreshControl:(0,_jsxRuntime.jsx)(_reactNative.RefreshControl,{refreshing:refreshing,onRefresh:onRefresh,colors:['#6366F1']}),children:

(0,_jsxRuntime.jsx)(StatusDashboard,{
leapInfo:engine.leapInfo,norms:engine.norms,
adaptations:engine.adaptations,ageWeeks:engine.ageWeeks,
ageMo:engine.ageMo,sources:engine.sources}
)}
)},"status"
),

(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{children:
(0,_jsxRuntime.jsx)(_reactNative.ScrollView,{
contentContainerStyle:{paddingHorizontal:16,paddingBottom:180},
showsVerticalScrollIndicator:false,
refreshControl:(0,_jsxRuntime.jsx)(_reactNative.RefreshControl,{refreshing:refreshing,onRefresh:onRefresh,colors:['#6366F1']}),children:

(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{children:[

logs.length>0&&
(0,_jsxRuntime.jsx)(_Surface.Surface,{style:[{shadowColor:"#000",shadowOffset:{width:0,height:4},shadowOpacity:0.04,shadowRadius:16,elevation:2},{padding:16,marginBottom:16}],bg:"white",radius:"xxl",variant:"elevated",borderWidth:1,borderColor:"#F0ECE8",children:
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flexDirection:'row',alignItems:'center',gap:12},children:[
(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{style:{width:48,height:48,borderRadius:16,alignItems:'center',justifyContent:'center',backgroundColor:'#8B5CF6'},children:
(0,_jsxRuntime.jsx)(_vectorIcons.Ionicons,{name:"checkmark-circle",size:22,color:"white"})}
),
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flex:1},children:[
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:13,fontFamily:'Nunito_800ExtraBold',color:'#8A8A9E',textTransform:'uppercase',letterSpacing:0.5},variant:"body",weight:"extraBold",children:"\u0417\u0410 7 \u0414\u041D\u0415\u0419"}),
(0,_jsxRuntime.jsxs)(_Typography.Typography,{style:{fontSize:24,fontFamily:'Nunito_900Black',color:'#1A1A2E'},variant:"body",weight:"black",children:[
completionRate,"% ",(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:13,fontFamily:'Nunito_700Bold',color:'#8A8A9E'},variant:"body",weight:"bold",children:"\u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E"})]}
)]}
)]}
)}
),



allRituals.map(function(ritual){
var lastLog=getLastLog(ritual.id);
var totalMin=ritual.steps.reduce(function(s,st){return s+st.durationMin;},0);
var isEngine=ritual.id.startsWith('engine-');

return(
(0,_jsxRuntime.jsxs)(_Surface.Surface,{style:[{shadowColor:"#000",shadowOffset:{width:0,height:4},shadowOpacity:0.04,shadowRadius:16,elevation:2},{borderColor:isEngine?'rgba(139,92,246,0.19)':'#F0ECE8',marginBottom:12,overflow:'hidden'}],bg:"white",radius:"xxl",variant:"elevated",borderWidth:1,borderColor:"#F0ECE8",children:[
isEngine&&
(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{style:{paddingHorizontal:16,paddingVertical:6,backgroundColor:'rgba(139,92,246,0.06)'},children:
(0,_jsxRuntime.jsxs)(_Typography.Typography,{style:{fontSize:10,fontFamily:'Nunito_900Black',color:'#8B5CF6',textTransform:'uppercase',letterSpacing:0.5},variant:"body",weight:"black",children:["\u2728 \u0420\u0415\u041A\u041E\u041C\u0415\u041D\u0414\u041E\u0412\u0410\u041D\u041E \u0414\u041B\u042F ",
engine.norms.ageLabel," \xB7 ",engine.sources[0]]}
)}
),

(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{padding:16},children:[
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:12},children:[
(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{style:{
width:48,height:48,borderRadius:16,alignItems:'center',justifyContent:'center',
backgroundColor:isEngine?'#8B5CF6':'#F3E8FF'
},children:
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:24},variant:"body",children:ritual.emoji})}
),
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flex:1},children:[
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:16,fontFamily:'Nunito_900Black',color:'#1A1A2E'},variant:"body",weight:"black",children:ritual.name}),
(0,_jsxRuntime.jsxs)(_Typography.Typography,{style:{fontSize:12,fontFamily:'Nunito_700Bold',color:'#8A8A9E'},variant:"body",weight:"bold",children:[
ritual.steps.length," \u0448\u0430\u0433\u043E\u0432 \xB7 ~",totalMin," \u043C\u0438\u043D"]}
)]}
),
!ritual.isPreset&&!isEngine&&
(0,_jsxRuntime.jsx)(_reactNative.TouchableOpacity,{onPress:function onPress(){setEditingRitual(ritual);setView('editor');},style:{padding:8,borderRadius:12,backgroundColor:'#F5F5F9'},children:
(0,_jsxRuntime.jsx)(_vectorIcons.Ionicons,{name:"pencil",size:16,color:"#6B6B80"})}
)]}

),

(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{style:{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:12},children:
ritual.steps.map(function(step){return(
(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:8,paddingVertical:4,borderRadius:8,backgroundColor:'#F8FAFC'},children:[
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:12},variant:"body",children:step.icon}),
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:11,fontFamily:'Nunito_700Bold',color:'#475569'},variant:"body",weight:"bold",children:step.label})]},step.id
));}
)}
),

(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},children:[
lastLog!=null&&lastLog.finishedAt?
(0,_jsxRuntime.jsxs)(_Typography.Typography,{style:{fontSize:11,fontFamily:'Nunito_700Bold',color:'#4DBFAA'},variant:"body",weight:"bold",children:["\u2713 \u041F\u043E\u0441\u043B\u0435\u0434.: ",
new Date(lastLog.finishedAt).toLocaleDateString('ru-RU',{day:'numeric',month:'short'})]}
):

(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:11,fontFamily:'Nunito_700Bold',color:'#6B6B80'},variant:"body",weight:"bold",children:"\u0415\u0449\u0451 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u043B\u0441\u044F"}),

(0,_jsxRuntime.jsxs)(_reactNative.TouchableOpacity,{
onPress:function onPress(){return handleStartRitual(ritual);},
style:{
flexDirection:'row',alignItems:'center',gap:6,
paddingHorizontal:16,paddingVertical:8,borderRadius:12,
backgroundColor:'#8B5CF6',
shadowColor:'#8B5CF6',shadowOffset:{width:0,height:4},shadowOpacity:0.3,shadowRadius:12,elevation:2
},children:[

(0,_jsxRuntime.jsx)(_vectorIcons.Ionicons,{name:"play",size:14,color:"white"}),
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontFamily:'Nunito_800ExtraBold',fontSize:13,color:'white'},variant:"body",weight:"extraBold",children:"\u041D\u0430\u0447\u0430\u0442\u044C"})]}
)]}
)]}
)]},ritual.id
));

}),


(0,_jsxRuntime.jsxs)(_Wrapper.Wrapper,{style:{padding:16,borderRadius:16,alignItems:'center',backgroundColor:'#F0EEFF',borderWidth:1,borderStyle:'solid',borderColor:'rgba(196, 181, 253, 0.3)',marginBottom:20},children:[
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:11,fontFamily:'Nunito_800ExtraBold',color:'#8B5CF6',textTransform:'uppercase',letterSpacing:0.5},variant:"body",weight:"extraBold",children:"\u0424\u0420\u0410\u0417\u0410-\u042F\u041A\u041E\u0420\u042C \u041D\u0410 \u041D\u041E\u0427\u042C"}),
(0,_jsxRuntime.jsxs)(_Typography.Typography,{style:{fontSize:16,fontFamily:'Nunito_900Black',color:'#5B21B6',marginTop:4},variant:"body",weight:"black",children:["\xAB",engine.bedtimeRitual.anchorPhrase,"\xBB"]}),
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontSize:11,fontFamily:'Nunito_600SemiBold',color:'#7C3AED',marginTop:4},variant:"body",weight:"semiBold",children:"\u041F\u043E\u0432\u0442\u043E\u0440\u044F\u0439\u0442\u0435 \u043A\u0430\u0436\u0434\u044B\u0439 \u0432\u0435\u0447\u0435\u0440 \u043E\u0434\u043D\u0443 \u0438 \u0442\u0443 \u0436\u0435 \u0444\u0440\u0430\u0437\u0443"})]}
),

(0,_jsxRuntime.jsxs)(_reactNative.TouchableOpacity,{onPress:function onPress(){setEditingRitual(null);setView('editor');},style:{width:'100%',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,paddingVertical:16,borderRadius:16,borderWidth:2,borderStyle:'dashed',borderColor:'#D1D5DB',backgroundColor:'#FAFBFC'},children:[
(0,_jsxRuntime.jsx)(_vectorIcons.Ionicons,{name:"add",size:18,color:"#6B6B80"}),
(0,_jsxRuntime.jsx)(_Typography.Typography,{style:{fontFamily:'Nunito_800ExtraBold',fontSize:14,color:'#6B6B80'},variant:"body",weight:"extraBold",children:"\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0441\u0432\u043E\u0439 \u0440\u0438\u0442\u0443\u0430\u043B"})]}
)]}

)}
)},"rituals"
),

(0,_jsxRuntime.jsx)(_Wrapper.Wrapper,{children:
(0,_jsxRuntime.jsx)(_reactNative.ScrollView,{contentContainerStyle:{paddingHorizontal:16,paddingBottom:180},showsVerticalScrollIndicator:false,children:
(0,_jsxRuntime.jsx)(EngineSchedule,{
schedule:engine.schedule,leapInfo:engine.leapInfo,
norms:engine.norms,onChangeWakeUp:setWakeUpTime,wakeUpTime:wakeUpTime}
)}
)},"schedule"
)]}
):

(0,_jsxRuntime.jsxs)(_reactNative.ScrollView,{contentContainerStyle:{paddingHorizontal:16,paddingBottom:180},showsVerticalScrollIndicator:false,children:[
view==='checklist'&&activeRitual&&activeLog&&
(0,_jsxRuntime.jsx)(RitualChecklist,{
ritual:activeRitual,log:activeLog,
onCompleteStep:completeStep,onFinish:handleFinishRitual,
onBack:function onBack(){setView('list');setActiveLog(null);setActiveRitual(null);},
anchorPhrase:activeRitual.id==='engine-bedtime'?engine.bedtimeRitual.anchorPhrase:undefined}
),


view==='editor'&&
(0,_jsxRuntime.jsx)(RitualEditor,{
initial:editingRitual||undefined,
onSave:handleSaveRitual,
onBack:function onBack(){setView('list');setEditingRitual(null);},
onDelete:editingRitual&&!editingRitual.isPreset?handleDeleteRitual:undefined}
)]}

)]}

));

};var _default=exports.default=
















RoutineScreen;