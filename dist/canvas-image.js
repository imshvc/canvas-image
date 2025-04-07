var CanvasImage={version:"20250407",count:0,contextAttributes:{alpha:!1,colorSpace:"srgb",desynchronized:!1,willReadFrequently:!0},create:function(t=1,e=1){t|=0,e|=0;let a=Object.setPrototypeOf({},CanvasImage);return a.id=CanvasImage.count++,a.width=t,a.height=e,a.context=null,a.image=null,a.created=+Date.now(),a.updated=0,a.path=null,a.ready=!0,a.locked=!1,a.dirty=!1,a.error=null,a.container=null,a.spawned=!1,0>=t||t>8192?(a.error="bad width",a):0>=e||e>8192?(a.error="bad height",a):(a.canvas=document.createElement("canvas"),a.canvas.width=t,a.canvas.height=e,a.canvas.resource=res,a.context=a.canvas.getContext("2d",CanvasImage.contextAttributes),null===a.context?(a.error="failed to create context",a):(a.image=new ImageData(t,e),a.image.data.fill(255),a.sync(),a))},load:function(t=null,e=null){if(null===t)return null;"function"!=typeof e&&(e=function(){});let a=CanvasImage.create().lock();a.ready=!1,a.path=t;let i=new Image;return i.crossOrigin="anonymous",i.addEventListener("load",(function(){let t=i.width,n=i.height;a.ready=!0,a.canvas.width=t,a.canvas.height=n,a.width=t,a.height=n,a.context.drawImage(i,0,0,t,n);try{a.image=a.context.getImageData(0,0,t,n)}catch(t){return a.ready=!1,a.error=t.message,e(a),a}a.unlock(),e(a)}),!1),i.addEventListener("error",(function(){a.error="failed to load image",e(a)}),!1),i.src=t,a},sync:function(){return this.context.putImageData(this.image,0,0),this.dirty=!1,this.updated=+Date.now(),this},setColor:function(t,e,a,i,n){if(this.locked)return this;t|=0,e|=0;let r=this.width*e*4+4*t;return this.image.data[r+0]=a,this.image.data[r+1]=i,this.image.data[r+2]=n,this.dirty=!0,this},getColor:function(t,e){t|=0,e|=0;let a=this.width*e*4+4*t;return[this.image.data[a+0],this.image.data[a+1],this.image.data[a+2]]},setAlpha:function(t,e,a){if(this.locked)return this;t|=0,e|=0;let i=this.width*e*4+4*t;return this.image.data[i+3]=a,this.dirty=!0,this},getAlpha:function(t,e){t|=0,e|=0;let a=this.width*e*4+4*t;return this.image.data[a+3]},spawn:function(t=null){return this.error?this:null===t||t instanceof Element==!1?(this.error="container not element",this):null!==this.container?(this.error="resource already spawned",this):(t.append(this.canvas),this.container=t,this.spawned=!0,this)},despawn:function(){if(null===this.container)return this;let t=this.canvas.parentElement;return null===t||(t.removeChild(this.canvas),this.container=null,this.spawned=!1),this},clear:function(t=0,e=0,a=0){if(this.locked)return this;for(let i=0;i<this.image.data.length;i+=4)this.image.data[i+0]=t,this.image.data[i+1]=e,this.image.data[i+2]=a;return this},save:function(t="0.png"){let e=document.createElement("a");return e.href=this.canvas.toDataURL(),e.download=t,e.click(),this},lock:function(){return this.locked=!0,this},unlock:function(){return this.locked=!1,this},clone:function(){let t=CanvasImage.create(this.width,this.height);for(let e=0;e<this.image.data.length;e+=4)t.image.data[e+0]=this.image.data[e+0],t.image.data[e+1]=this.image.data[e+1],t.image.data[e+2]=this.image.data[e+2],t.image.data[e+3]=this.image.data[e+3];return t.sync(),t},getChannel:function(t=0){0>(t|=0)&&(t=0),t>3&&(t=3);let e=CanvasImage.create(this.width,this.height);for(let a=0;a<e.image.data.length;a+=4)e.image.data[a+0]=this.image.data[a+t],e.image.data[a+1]=this.image.data[a+t],e.image.data[a+2]=this.image.data[a+t];return e.sync(),e}};