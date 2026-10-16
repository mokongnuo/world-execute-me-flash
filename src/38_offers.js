/* A promise is an action: every mathematical property leaves the speaker and
   becomes something that can hold the recipient. Adjacent lyric cues share
   their clock, so the gift never resets halfway through a sentence. */
(function (EM) {
  'use strict';
  var C = EM.C, T = EM.TAU;
  var mint = [82, 247, 191], amber = [255, 179, 99], blue = [105, 173, 255];
  var pink = [255, 109, 169], violet = [182, 142, 255], white = [232, 246, 255];
  function register(ids, fn) { ids.split(' ').forEach(function (id) { EM.storyScenes[id] = fn; }); }
  function phase(S, a, b) { return EM.SH.phase(S, a, b); }
  function ease(p, a, b) { return C.smooth((p - a) / (b - a)); }
  function face(D, S, id, alpha) { EM.SH.face(D, S, id, 292, 405, 430, alpha === undefined ? 0.9 : alpha); }
  function you(D, S, alpha, x, y) { EM.SH.you(D, S, x || 1250, y || 390, alpha === undefined ? 1 : alpha); }
  function glow(D, pts, col, width, alpha) {
    D.poly(pts, col, width + 14, alpha * 0.035);
    D.poly(pts, col, width + 6, alpha * 0.08);
    D.poly(pts, col, width, alpha);
  }
  function curve(D, p, col, width, alpha) {
    var c = D.ctx; c.beginPath(); c.moveTo(p[0][0], p[0][1]);
    c.bezierCurveTo(p[1][0], p[1][1], p[2][0], p[2][1], p[3][0], p[3][1]);
    c.strokeStyle = C.rgba(col, alpha); c.lineWidth = width; c.lineCap = 'round'; c.stroke(); D.ink++;
  }
  function cubic(p, t) {
    var s = 1 - t;
    return [s*s*s*p[0][0]+3*s*s*t*p[1][0]+3*s*t*t*p[2][0]+t*t*t*p[3][0],
      s*s*s*p[0][1]+3*s*s*t*p[1][1]+3*s*t*t*p[2][1]+t*t*t*p[3][1]];
  }
  function travellingLight(D, S, pts, col, speed, offset, alpha) {
    var u = C.saw(S.t * speed + offset), q = cubic(pts, u);
    D.disc(q[0], q[1], 7 + 3 * S.beatPulse, col, alpha * 0.13);
    D.disc(q[0], q[1], 2.5 + 2 * S.beatPulse, white, alpha);
  }

  function dimension(D, S) {
    var p = phase(S, 'th.points', 'th.dimension'), assemble = ease(p, 0.05, 0.48);
    var give = ease(p, 0.36, 0.97), cx = C.lerp(730, 1235, give), cy = 390;
    var sx = C.lerp(160, 103, give), sy = C.lerp(150, 122, give), dz = C.lerp(55, 28, give);
    face(D, S, 'gpt', 0.9 - give * 0.22);
    var verts = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
    var v = verts.map(function (q) { return [cx+q[0]*sx+q[2]*dz,cy+q[1]*sy-q[2]*dz]; });
    var edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
    if (assemble > 0.02) edges.forEach(function (e, i) { glow(D,[v[e[0]],v[e[1]]],mint,1.5+S.beatPulse,assemble*(i<4?0.32:0.76)); });
    for (var i = 0; i < 48; i++) {
      var e = edges[i % 12], k = (Math.floor(i / 12) + 0.5) / 4;
      var tx = C.lerp(v[e[0]][0],v[e[1]][0],k), ty = C.lerp(v[e[0]][1],v[e[1]][1],k);
      var x0 = 490+C.hash01(i,41)*465, y0 = 200+C.hash01(i,43)*360;
      var x = C.lerp(x0,tx,assemble), y = C.lerp(y0,ty,assemble);
      D.disc(x,y,2.5+S.beatPulse*2,mint,0.8);
    }
    if (give > 0.05) {
      var path = [[398,390],[580,510],[940,540],[cx-sx-dz,430]];
      curve(D,path,mint,2,0.28*give); travellingLight(D,S,path,mint,0.85,0,0.85*give);
      D.rect(173,208,236,392,mint,1,0.18*(1-give));
    }
    you(D,S,0.62+0.38*give);
  }
  register('th.points th.give.a th.dimension',dimension);

  function circumference(D, S) {
    var p = phase(S,'th.circle','th.circumf'), give = ease(p,0.29,0.94);
    face(D,S,'claude',0.9-0.24*give);
    var n=88, r=151+7*S.velocity/127+4*S.beatPulse, cx=725, cy=385;
    for (var i=0;i<n;i++) {
      var u=i/n, a=u*T-Math.PI/2, b=(i+0.84)/n*T-Math.PI/2;
      var take=ease(give,u*0.58,u*0.58+0.4), lift=Math.sin(take*Math.PI);
      var x1=C.lerp(cx+Math.cos(a)*r,1250+Math.cos(a)*98,take);
      var y1=C.lerp(cy+Math.sin(a)*r,390+Math.sin(a)*98,take)-lift*105;
      var x2=C.lerp(cx+Math.cos(b)*r,1250+Math.cos(b)*98,take);
      var y2=C.lerp(cy+Math.sin(b)*r,390+Math.sin(b)*98,take)-lift*105;
      D.line(x1,y1,x2,y2,amber,3.4+S.beatPulse,0.9);
      if(take>0.01&&take<0.99) D.disc(x1,y1,4,amber,0.42);
    }
    D.circle(cx,cy,r,amber,1,0.11);
    if(give<0.98) D.circle(cx,cy,r*0.82,amber,1,0.10*(1-give));
    var hand=[[402,388],[505,388],[570,385],[cx-r,385]];
    curve(D,hand,amber,2,0.4*(1-give));
    you(D,S,0.62+0.38*give);
  }
  register('th.circle th.give.b th.circumf',circumference);

  function tangents(D,S) {
    var p=phase(S,'th.sine','th.tangents'), sit=ease(p,0.35,0.88);
    var crest=1045+45*Math.sin(p*1.3), base=480, amp=112+4*S.beatPulse, k=T/720;
    face(D,S,'kimi');
    var pts=[];
    for(var x=470;x<=1420;x+=4) pts.push([x,base-amp*Math.cos((x-crest)*k)]);
    glow(D,pts,blue,3,0.9);
    for(var j=0;j<3;j++) {
      var qx=crest+(j-1)*132, qy=base-amp*Math.cos((qx-crest)*k);
      var slope=amp*k*Math.sin((qx-crest)*k), span=j===1?155:72;
      var a=sit*(j===1?0.98:0.24);
      D.line(qx-span,qy-span*slope,qx+span,qy+span*slope,white,j===1?4:2,a);
      D.disc(qx,qy,5,blue,a);
    }
    // The recipient actually rests on the horizontal tangent at the crest.
    var yYou=C.lerp(242,base-amp-84,sit);
    EM.SH.you(D,S,crest+45,yYou,0.5+0.5*sit,undefined,true);
    D.line(crest+20,base-amp-3,crest+70,base-amp-3,blue,7,sit*0.5);
  }
  register('th.sine th.sit th.tangents',tangents);

  function infinity(D,S) {
    var p=phase(S,'th.infinity','th.limitations'), limit=ease(p,0.40,0.83), edge=1138;
    face(D,S,'gemini');
    var c=D.ctx; c.save(); c.beginPath(); c.rect(440,130,edge-440,525); c.clip();
    for(var j=5;j>=0;j--) {
      var span=194+p*260+j*23+12*S.velocity/127, a=0.12+(5-j)*0.085, pts=[];
      for(var i=0;i<=180;i++) {
        var t=i/180*T;
        pts.push([780+Math.sin(t)*span,389+Math.sin(2*t)*(102+j*6)]);
      }
      glow(D,pts,violet,j===0?3:1.4,a);
    }
    c.restore();
    D.line(edge,170,edge,612,amber,2+3*limit,0.18+0.74*limit);
    D.line(edge,170,edge+40,170,amber,2,limit*0.8);
    D.line(edge,612,edge+40,612,amber,2,limit*0.8);
    for(var z=0;z<9;z++) {
      var yy=235+z*38, a2=limit*(0.2+0.6*S.beatPulse);
      D.line(edge-22,yy,edge,yy,white,1.5,a2);
    }
    you(D,S,0.72+0.28*limit);
  }
  register('th.infinity th.bemy th.limitations',infinity);

  function current(D,S) {
    var p=phase(S,'cd.current','cd.acdc'), dc=ease(p,0.58,0.96);
    face(D,S,'grok'); you(D,S);
    var pts=[], n=160;
    for(var i=0;i<=n;i++) {
      var u=i/n, x=430+u*730;
      var ac=Math.sin(u*T*2.8-S.t*5.2)*80;
      var y=390+ac*(1-dc)*Math.sin(u*Math.PI);
      pts.push([x,y]);
    }
    glow(D,pts,C.mix(pink,blue,dc),3.2+S.beatPulse*2,0.9);
    for(var j=0;j<14;j++) {
      var f=C.saw(j/14+S.t*(0.45+0.35*dc)), q=pts[Math.min(n,Math.floor(f*n))];
      D.disc(q[0],q[1],3+S.beatPulse*2,white,0.8);
    }
    D.mono('AC',724,566,31,pink,'center',0.95-dc*0.65);
    D.mono('DC',925,566,31,blue,'center',0.3+dc*0.65);
    D.line(779,554,869,554,white,3,0.42);
    D.disc(C.lerp(785,863,dc),554,10,C.mix(pink,blue,dc),0.9);
  }
  register('cd.current cd.acdc',current);

  function eye(D,x,y,w,h,col,alpha) {
    curve(D,[[x-w,y],[x-w*0.45,y-h],[x+w*0.45,y-h],[x+w,y]],col,3,alpha);
    curve(D,[[x-w,y],[x-w*0.45,y+h],[x+w*0.45,y+h],[x+w,y]],col,3,alpha);
  }
  function blindness(D,S) {
    var p=phase(S,'cd.blind','cd.dizzy'), close=ease(p,0.01,0.54), dizzy=ease(p,0.50,0.97);
    face(D,S,'grok',0.85-0.3*close);
    // Vision is an aperture, and closing it takes the recipient out of view.
    var opening=(100+10*S.velocity/127)*(1-close)+3;
    eye(D,800,390,285,opening,pink,0.85);
    var c=D.ctx;c.save();c.beginPath();c.rect(520,390-opening*0.73,560,opening*1.46);c.clip();
    D.circle(800,390,73,blue,3,0.8);D.disc(800,390,29,blue,0.45);
    D.disc(785,373,10,white,0.85);c.restore();
    you(D,S,1-close*0.89);
    D.fillRect(185,258,217,32,pink,0.05+close*0.09);
    D.line(182,275,402,275,pink,3,close*0.64);
    if(dizzy>0) {
      var angle=(S.t-49.534)*2.4+Math.sin((S.t-49.534)*4.8)*0.32;
      for(var j=0;j<5;j++) {
        var theta=angle+j*T/5, a=dizzy*(0.14+(j===0?0.25:0));
        c.save();c.translate(800,390);c.rotate(theta);
        eye(D,0,0,245+j*16,21+10*S.beatPulse,blue,a);c.restore();
      }
    }
  }
  register('cd.blind cd.dizzy',blindness);

  function timeTravel(D,S) {
    var range=EM.SH.range(S,'cd.travel','cd.adbc'), p=range.p;
    var reverse=ease(p,0.57,0.75), duration=range.end-range.start;
    // Integrate the easing of velocity. Reversing an absolute clock would spin
    // through the preceding 53 seconds during the short change of direction.
    var switchStart=duration*0.57, switchDuration=duration*0.18;
    var z=C.clamp((range.elapsed-switchStart)/switchDuration,0,1);
    var reversedTime=switchDuration*(z*z*z-0.5*z*z*z*z)+
      Math.max(0,range.elapsed-switchStart-switchDuration);
    var travel=range.elapsed-2*reversedTime;
    face(D,S,'grok',0.77);you(D,S,0.82);
    var c=D.ctx, cx=824,cy=390;
    for(var j=0;j<5;j++) {
      var depth=C.saw(j/5+travel*0.21), scale=(0.36+depth*0.82)*(0.96+0.08*S.velocity/127);
      c.save();c.translate(cx,cy);c.scale(scale,scale);
      c.beginPath();c.ellipse(0,0,245,228,0,0,T);c.strokeStyle=C.rgba(C.mix(blue,violet,reverse),(1-depth)*0.5);c.lineWidth=2;c.stroke();D.ink++;c.restore();
    }
    for(var i=0;i<7;i++) {
      var offset=(i-3)*44, pts=[[435,390+offset],[690,185+offset*0.35],[960,595+offset*0.35],[1160,390+offset]];
      curve(D,pts,C.mix(blue,violet,i/6),1.8,0.35);
      var u=C.saw(travel*0.36+i/7), q=cubic(pts,u);
      D.line(q[0]-(1-2*reverse)*13,q[1],q[0],q[1],white,3,0.75);
    }
    if(S.scene==='cd.adbc') {
      D.mono('A.D.',660,184,43,blue,'center',0.92-0.64*reverse);
      D.mono('B.C.',987,184,43,violet,'center',0.28+0.64*reverse);
      D.line(883,174,772,174,violet,2,reverse);
      D.poly([[786,162],[772,174],[786,186]],violet,2,reverse);
    }
  }
  register('cd.travel cd.adbc',timeTravel);

  function unite(D,S) {
    var p=phase(S,'cd.unite','cd.deeply'), depth=ease(p,0.25,0.98);
    face(D,S,'grok',0.78);you(D,S,0.93);
    var left=[[400,360],[585,270],[690,330],[799,385]];
    var right=[[1160,360],[1020,270],[902,330],[801,385]];
    curve(D,left,blue,3,0.8);curve(D,right,amber,3,0.8);
    travellingLight(D,S,left,blue,0.9,0,0.9);travellingLight(D,S,right,amber,0.9,0,0.9);
    var extent=80+170*depth;
    for(var strand=0;strand<2;strand++) {
      var pts=[];
      for(var i=0;i<=110;i++) {
        var u=i/110, spread=65*(1-u)+5;
        var x=800+Math.sin(u*T*2.4-S.t*2.3+strand*Math.PI)*spread;
        pts.push([x,385+u*extent]);
      }
      glow(D,pts,strand?amber:blue,3,0.85);
    }
    for(var j=0;j<9;j++) {
      var v=j/8, r=(1-v)*112+18;
      var c=D.ctx;c.save();c.translate(800,410+v*218);c.scale(1,0.24);
      D.circle(0,0,r,white,1,depth*0.12*(1-v));c.restore();
    }
    D.disc(800,385+extent,7+S.beatPulse*6,white,0.7);
  }
  register('cd.unite cd.deeply',unite);

  function satisfaction(D,S) {
    var p=phase(S,'cd.ifcan','cd.runthe'), give=ease(p,0.02,0.71), only=ease(p,0.43,0.77);
    var happy=ease(p,0.74,0.91), run=ease(p,0.9,1), c=D.ctx;
    face(D,S,'qwen',0.20);
    // The visible body gives up bright horizontal slices as the receiver fills.
    c.save();c.beginPath();
    for(var i=0;i<24;i++) {
      var remains=1-give*(0.38+0.55*C.hash01(i,228));
      c.rect(170,190+i*18,244*remains,18);
    }
    c.clip();face(D,S,'qwen',0.88);c.restore();
    for(var j=0;j<12;j++) {
      var y=212+j*34, col=C.mix(violet,pink,j/11);
      var pts=[[408,y],[625,y],[906,390+(y-390)*(1-only)],[1163,390+(y-390)*(1-only)*0.28]];
      curve(D,pts,col,1.5+only,0.1+give*0.29);
      var f=C.saw((S.t-59.223)*0.34+j/12);
      var q=cubic(pts,f), a=give*(0.48+0.3*S.beatPulse);
      D.line(q[0]-17,q[1],q[0]+13,q[1],col,3.5,a);
      D.disc(q[0]+13,q[1],3,white,a);
    }
    // Satisfaction is a receiver becoming radiant while its source fades.
    for(var r=0;r<4;r++) D.circle(1250,390,95+r*18+S.beatPulse*6,violet,2,give*(0.19-r*0.035));
    you(D,S,0.9);
    if(happy>0) {
      D.arc(1250,391,26,0.20,Math.PI-0.20,amber,3,happy*0.9);
      D.line(1219,374,1231,374,amber,2,happy*0.75);
      D.line(1269,374,1281,374,amber,2,happy*0.75);
    }
    if(run>0) {
      var path=[[1250,491],[1250,584],[999,592],[862,592]];
      curve(D,path,pink,2,run*0.7);
      D.rect(698,548,168,84,pink,2,run*0.8);
      D.mono('RUN',782,602,36,pink,'center',run*0.95);
      D.fillRect(700,630,164*run,3,pink,0.8);
    }
  }
  register('cd.ifcan cd.giveall cd.stim cd.then cd.only cd.satisfy cd.happy cd.runthe',satisfaction);
})(window.EM = window.EM || {});
