"use strict";

function roundRect(c,x,y,w,h,r){
  c.beginPath();
  c.moveTo(x+r,y);
  c.arcTo(x+w,y,x+w,y+h,r);
  c.arcTo(x+w,y+h,x,y+h,r);
  c.arcTo(x,y+h,x,y,r);
  c.arcTo(x,y,x+w,y,r);
  c.closePath();
}

function shareCardEmoji(code,day){
  if(code<=1) return day?"☀️":"";
  if(code<=3) return day?"🌤️":"☁️";
  if(code<=48) return "🌫️";
  if(code<=67||(code>=80&&code<=82)) return "🌧️";
  if(code<=77||code===85||code===86) return "❄️";
  return "⛈️";
}

function shareCardTheme(code,day){
  if(code>=95) return ["#241b3e","#3a2d63"];
  if(!day) return ["#0b1026","#1c2a52"];
  if(code<=1) return ["#2f7fd6","#8ec9f2"];
  if(code<=3) return ["#3b6fa0","#7fa8cc"];
  if(code<=48) return ["#6b7280","#9aa4b2"];
  if(code<=77||code===85||code===86) return ["#7d8ca3","#b9c7d6"];
  return ["#39415a","#5a6478"];
}

function exportCard(cv,city){
  cv.toBlob(function(blob){
    if(!blob){ if(window.toast)toast("Erreur de génération"); return; }
    var file=new File([blob],"plein-ciel.png",{type:"image/png"});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      navigator.share({files:[file],title:"Plein Ciel",text:"La météo à "+city}).catch(function(){});
    }else{
      var a=document.createElement("a");
      a.href=URL.createObjectURL(blob);
      a.download="plein-ciel.png";
      document.body.appendChild(a);a.click();a.remove();
      if(window.toast)toast("Carte téléchargée ✔");
    }
  },"image/png");
}

function generateShareCard(){
  var st=(typeof state!=="undefined")?state:{};
  var loc=st.loc||{};
  var ls=null; try{ ls=JSON.parse(localStorage.getItem("pc_widget_loc")||"null"); }catch(e){}
  var cur=st.cur||(st.fc&&st.fc.current)||{};
  var city=loc.name||(ls&&ls.name)||st.name||"Plein Ciel";
  var lat=loc.lat||(ls&&ls.lat)||48.85;
  var lon=loc.lon||(ls&&ls.lon)||2.35;
  var t=Math.round(cur.temperature_2m!=null?cur.temperature_2m:0);
  var code=cur.weather_code!=null?cur.weather_code:0;
  var hh=new Date().getHours();
  var day=cur.is_day!=null?cur.is_day===1:(hh>=7&&hh<21);
  var wind=Math.round(cur.wind_speed_10m!=null?cur.wind_speed_10m:0);
  var hum=Math.round(cur.relative_humidity_2m!=null?cur.relative_humidity_2m:0);

  var W=1080,H=1350;
  var cv=document.createElement("canvas");
  cv.width=W;cv.height=H;
  var c=cv.getContext("2d");

  var th=shareCardTheme(code,day);
  var g=c.createLinearGradient(0,0,0,H);
  g.addColorStop(0,th[0]);g.addColorStop(1,th[1]);
  c.fillStyle=g;c.fillRect(0,0,W,H);

  if(!day){
    c.fillStyle="rgba(255,255,255,.7)";
    for(var i=0;i<60;i++){
      c.fillRect((i*137.5)%W,(i*89.3)%(H/2),3,3);
    }
  }

  c.textAlign="center";
  c.fillStyle="#ffffff";
  c.font="700 64px system-ui, sans-serif";
  c.fillText("PLEIN CIEL",W/2,130);
  c.font="400 40px system-ui, sans-serif";
  c.fillStyle="rgba(255,255,255,.85)";
  c.fillText(new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"}),W/2,195);

  c.font="220px system-ui, sans-serif";
  c.fillText(shareCardEmoji(code,day),W/2,520);

  c.font="800 200px system-ui, sans-serif";
  c.fillStyle="#ffffff";
  c.fillText(t+"°",W/2,780);

  c.font="700 64px system-ui, sans-serif";
  c.fillText(city,W/2,900);

  c.font="400 44px system-ui, sans-serif";
  c.fillStyle="rgba(255,255,255,.9)";
  c.fillText("💨 "+wind+" km/h   ·   💧 "+hum+" %",W/2,980);

  var qrUrl="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data="+
    encodeURIComponent("https://mikefri.github.io/Plein_Ciel/?lat="+lat+"&lon="+lon+"&n="+encodeURIComponent(city));

  c.fillStyle="rgba(255,255,255,.95)";
  roundRect(c,60,H-330,W-120,270,30);c.fill();
  c.textAlign="left";
  c.fillStyle="#12305a";
  c.font="700 44px system-ui, sans-serif";
  c.fillText("Scanne et découvre",420,H-235);
  c.fillText("le ciel en direct !",420,H-180);
  c.font="400 32px system-ui, sans-serif";
  c.fillStyle="#5a6478";
  c.fillText("mikefri.github.io/Plein_Ciel",420,H-110);

  var img=new Image();
  img.crossOrigin="anonymous";
  img.onload=function(){ c.drawImage(img,100,H-300,240,240); exportCard(cv,city); };
  img.onerror=function(){ exportCard(cv,city); };
  img.src=qrUrl;
}

/* Le bouton partage existant déclenche la carte (pas de bouton en plus) */
document.addEventListener("DOMContentLoaded",function(){
  var b=document.getElementById("shareBtn");
  if(!b) return;
  var n=b.cloneNode(true);
  b.parentNode.replaceChild(n,b);
  n.title="Partager la carte météo";
  n.addEventListener("click",generateShareCard);
});
