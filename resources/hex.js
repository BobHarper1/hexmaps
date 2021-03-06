function HexMap(id,w,h,s,file){

	this.w = w;
	this.h = h;
	this.aspectratio = w/h;
	this.id = id;
	this.hexes = {};
	var colour = "#cccccc";
	var colour_selected = "#efefef";
	this.min = 0;
	this.max = 1;
	this.saveable = (typeof Blob==="function");
	
	this.mapping = {};
	this.properties = { 'size': (typeof s==="number" ? s : 10) };

	// Update text of button
	if(this.saveable){
		// Add event to button
		S('#save').on('click',{me:this},function(e){ e.data.me.save(); });
		// Add key binding
		S(document).on('keypress',function(e){
			if(e.originalEvent.charCode==109) S('#savesvg').trigger('click');     // M
			if(e.originalEvent.charCode==104) S('#save').trigger('click');     // H
		});

		// Add event to button
		S('#savesvg').on('click',{me:this},function(e){ e.data.me.saveSVG(); });

		function updateClass(btn){
			S('.switchdata').addClass('b5-bg').removeClass('c10-bg');btn.removeClass('b5-bg').addClass('c10-bg');
		}
		// Add event to button
		S('#colour-pop').on('click',{me:this},function(e){ e.data.me.setColours('population'); updateClass(this); });
		S('#colour-reg').on('click',{me:this},function(e){ e.data.me.setColours('region'); updateClass(this); });
		S('#colour-pty').on('click',{me:this},function(e){ e.data.me.setColours('party'); updateClass(this); });
		S('#colour-ref').on('click',{me:this},function(e){ e.data.me.setColours('referendum'); updateClass(this); });
		S('#colour-can').on('click',{me:this},function(e){ e.data.me.setColours('candidates'); updateClass(this); });

	}else{
		S('#save').css({'display':'none'});
		S('#savesvg').css({'display':'none'});
	}
	
	S(document).ajax(file,{
		'complete': function(data){
			this.setMapping(data);
			this.initialized();
		},
		'error': this.failLoad,
		'this': this,
		'dataType':'json'
	});

	var _obj = this;
	// We'll need to change the sizes when the window changes size
	window.addEventListener('resize', function(event){ _obj.resize(); });

	this.selectRegion = function(r){
		this.selected = r;
		for(region in this.hexes){
			h = this.hexes[region];
			if(region.indexOf(r)==0){
				h.selected = true;
				h.attr({'fill':(h.selected ? h.fillcolour : colour)});
			}else{
				h.selected = false;
				h.attr({'fill': h.fillcolour});
			}
		}
		return this;
	}
	
	this.moveTo = function(q,r){
		if(this.selected){
			var h = this.drawHex(q,r);
			this.hexes[this.selected].attr({'path':h.path}).update();
			this.labels[this.selected].attr({'x':h.x,'y':h.y+this.properties.fs/2});
			this.mapping.hexes[this.selected].q = q;
			this.mapping.hexes[this.selected].r = r;
			for(region in this.hexes){
				if(region.indexOf(this.selected)==0){
					h = this.hexes[region];
					h.selected = false;
					h.attr({'fill':h.fillcolour});
				}
			}
			this.selected = "";
		}
	}

	this.size = function(w,h){
		S('#'+this.id).css({'height':'','width':''});
		w = Math.min(this.w,S('#'+this.id)[0].offsetWidth);
		S('#'+this.id).css({'height':(w/this.aspectratio)+'px','width':w+'px'});
		this.paper = new SVG(this.id);
		w = this.paper.w;
		h = this.paper.h;
		this.transform = {'type':'scale','props':{x:w,y:h,cx:w,cy:h,r:w,'stroke-width':w}};
		
		return this;
	}
	this.resize = function(){
		return this;
	}

	this.initialized = function(){
		this.create().draw();
		S('.spinner').remove();
		return this;
	}
	this.create = function(){
		this.paper.clear();
		return this;
	}

	this.saveSVG = function(){

		// Make hex json
		var str = this.paper.canvas.html();
		this.save(str,"map.svg",'text/application/svg+xml');

		return this;
	}


	this.save = function(str,file,type){

		// Make hex json

		if(!str) str = JSON.stringify(this.mapping).replace(/\}\,/g,"},\n\t\t").replace(/\}\}\}/,"}\n\t\}\n\}").replace(/\"hexes\":{/,"\n\t\"hexes\": {\n\t\t").replace(/{"layout"/,"{\n\t\"layout\"");
		if(!file) file = "test.hexjson";
		if(!type) type = 'text/application/json';

		var textFileAsBlob = new Blob([str], {type:type});
		var fileNameToSaveAs = file;
	
		function destroyClickedElement(event){ document.body.removeChild(event.target); }
		var dl = document.createElement("a");
		dl.download = fileNameToSaveAs;
		dl.innerHTML = "Download File";
		if(window.webkitURL != null){
			// Chrome allows the link to be clicked
			// without actually adding it to the DOM.
			dl.href = window.webkitURL.createObjectURL(textFileAsBlob);
		}else{
			// Firefox requires the link to be added to the DOM
			// before it can be clicked.
			dl.href = window.URL.createObjectURL(textFileAsBlob);
			dl.onclick = destroyClickedElement;
			dl.style.display = "none";
			document.body.appendChild(dl);
		}
		dl.click();
		return this;
	}

	this.label = function(id,l){
		if(S('.infobubble').length == 0) S('#'+id+'').after('<div class="infobubble"><div class="infobubble_inner"></div></div>');
		S('.infobubble_inner').html(l);
		return this;
	}

	this.autoscale = function(){
		var min = 1e100;
		var max = -1e100;
		for(var region in this.mapping.hexes){
			if(typeof this.values[region]==="number"){
				if(this.values[region] < min) min = this.values[region];
				if(this.values[region] > max) max = this.values[region];
			}
		}
		this.min = min;
		this.max = max;
		return this;
	}	
	this.update = function(){
		var b = new Colour(colour);
		var a = new Colour('#cccccc');

		function getColour(pc){ return 'rgb('+parseInt(a.rgb[0] + (b.rgb[0]-a.rgb[0])*pc)+','+parseInt(a.rgb[1] + (b.rgb[1]-a.rgb[1])*pc)+','+parseInt(a.rgb[2] + (b.rgb[2]-a.rgb[2])*pc)+')'; }
		
		var range = this.max-this.min;
		for(var region in this.mapping.hexes){
			this.hexes[region].fillcolour = (typeof this.values[region]==="number") ? getColour((this.values[region]-this.min)/range) : '#5f5f5f';
			this.hexes[region].attr({'fill':(this.hexes.hexes[region].selected ? this.hexes[region].fillcolour : '#5f5f5f')});
		}
		return this;
	}
	
	this.setMapping = function(mapping){
		this.mapping = mapping;
		if(!this.properties) this.properties = { "x": 100, "y": 100 };
		this.properties.x = this.w/2;
		this.properties.y = this.h/2;
		this.setSize();
		var p = mapping.layout.split("-");
		this.properties.shift = p[0];
		this.properties.orientation = p[1];

		return this;
	}

	this.setSize = function(size){
		if(size) this.properties.size = size;
		this.properties.s = { 'cos': this.properties.size*Math.sqrt(3)/2, 'sin': this.properties.size*0.5 };
		this.properties.s.c = this.properties.s.cos.toFixed(2);
		this.properties.s.s = this.properties.s.sin.toFixed(2);
		return this;
	}

	this.drawHex = function(q,r,scale){
		if(this.properties){
			if(typeof scale!=="number") scale = 1;
			scale = Math.sqrt(scale);

			var x = this.properties.x + (q * this.properties.s.cos * 2);
			var y = this.properties.y - (r * this.properties.s.sin * 3);

			if(this.properties.orientation == "r"){
				if(this.properties.shift=="odd" && r&1==1) x += this.properties.s.cos;
				if(this.properties.shift=="even" && r&1==0) x += this.properties.s.cos;
			}
			if(this.properties.orientation == "q"){
				if(this.properties.shift=="odd" && q&1==1) y += this.properties.s.cos;
				if(this.properties.shift=="even" && q&1==0) y += this.properties.s.cos;
			}
			
			var path = [['M',[x,y]]];
			var cs = this.properties.s.c * scale;
			var ss = this.properties.s.s * scale;
			if(this.properties.orientation == "r"){
				// Pointy topped
				path.push(['m',[cs,-ss]]);
				path.push(['l',[-cs,-ss,-cs,ss,0,(this.properties.size*scale).toFixed(2),cs,ss,cs,-ss]]);
				path.push(['z',[]]);
			}else{
				// Flat topped
				path.push(['m',[-ss,cs]]);
				path.push(['l',[-ss,-cs,ss,cs,(this.properties.size*scale).toFixed(2),0,ss,cs,-ss,cs]]);
				path.push(['z',[]]);
			}
			return { 'path':path, 'x':x, 'y': y };
		}
		return this;
	}

	var b = new Colour('#F9BC26');
	var a = new Colour('#2254F4');

	function getColour(pc){
		return 'rgb('+parseInt(a.rgb[0] + (b.rgb[0]-a.rgb[0])*pc)+','+parseInt(a.rgb[1] + (b.rgb[1]-a.rgb[1])*pc)+','+parseInt(a.rgb[2] + (b.rgb[2]-a.rgb[2])*pc)+')';
	}
	function getRegionColour(r){
		rs = {'YH':'#F9BC26','EM':'#00B6FF','WM':'#E6007C','EA':'#FF6700','SC':'#2254F4','NI':'#722EA5','WA':'#0DBC37','NW':'#1DD3A7','NE':'#D60303','SW':'#178CFF','LO':'#D73058','SE':'#67E767'};
		return (rs[r] || colour);
	}
	function getCandidateColour(n){
		c = '#2254F4';
		if(n > 1) c = '#178CFF';
		if(n > 2) c = '#00B6FF';
		if(n > 3) c = '#08DEF9';
		if(n > 4) c = '#1DD3A7';
		if(n > 5) c = '#67E767';
		if(n > 6) c = '#F9BC26';
		return c;
	}
	function getPartyColour(r){
		var p = {'Con':'#2254F4','Lab':'#D60303','LD':'#F9BC26','SNP':'#FF6700','PC':'#1DD3A7','UKIP':'#722EA5','Green':'#0DBC37','DUP':'#4f4c9a','SDLP':'#fbb675','SF':'#b6c727','UUP':'#EF3AAB','Ind':'#dfdfdf','Spk':'#909090'};
		return (p[r] || colour);
	}

	this.draw = function(){

		var r,q;
		var h,p;
		this.properties.fs = this.properties.size*0.4;

		var range = { 'r': {'min':1e100,'max':-1e100}, 'q': {'min':1e100,'max':-1e100} };
		for(region in this.mapping.hexes){
			q = this.mapping.hexes[region].q;
			r = this.mapping.hexes[region].r;
			if(q > range.q.max) range.q.max = q;
			if(q < range.q.min) range.q.min = q;
			if(r > range.r.max) range.r.max = r;
			if(r < range.r.min) range.r.min = r;
		}
		// q,r coordinate of the centre of the range
		qp = (range.q.max+range.q.min)/2;
		rp = (range.r.max+range.r.min)/2;
		
		this.properties.x = (this.w/2) - (this.properties.s.cos * 2 *qp);
		this.properties.y = (this.h/2) + (this.properties.s.sin * 3 *rp);
		
		
		this.grid = new Array();
		
		for(q = range.q.min; q <= range.q.max; q++){
			for(r = range.r.min; r <= range.r.max; r++){
				h = this.drawHex(q,r);
				//this.paper.text(h.x,h.y+this.properties.fs/2,q+"\n"+r).attr({'text-anchor':'middle','font-size':this.properties.fs+'px','fill':'#777'});
				this.grid.push(this.paper.path(h.path).attr({'fill':colour_selected,'fill-opacity':0.1,'stroke':'#aaa','style':'cursor: pointer;'}));
				this.grid[this.grid.length-1].on('click',{hexmap:this,q:q,r:r},function(e){
					e.data.hexmap.moveTo(e.data.q,e.data.r);
				});
			}
		}

		var min = 50000;
		var max = 80000;
		/*
		for(region in this.mapping.hexes){
			if(this.mapping.hexes[region].p > max) max = this.mapping.hexes[region].p;
			if(this.mapping.hexes[region].p < min) min = this.mapping.hexes[region].p;
		}
		*/
		this.values = {};

		for(region in this.mapping.hexes){
			
			this.values[region] = (this.mapping.hexes[region].p - min)/(max-min);
			if(this.values[region].value < 0) this.values[region] = 0;
			if(this.values[region].value > 1) this.values[region] = 1;

			var h = this.drawHex(this.mapping.hexes[region].q,this.mapping.hexes[region].r);//,this.mapping.hexes[region].value*0.5 + 0.5);
			
			if(!this.constructed){
				if(!this.labels) this.labels = {};
				this.labels[region] = this.paper.text(h.x,h.y+this.properties.fs/2,this.mapping.hexes[region].n.substr(0,3)).attr({'text-anchor':'middle','font-size':this.properties.fs+'px','title':this.mapping.hexes[region].n});
				this.hexes[region] = this.paper.path(h.path);
				this.hexes[region].selected = true;

				// Attach events
				var _obj = this.hexes[region];
				_obj.id = 'hex-'+region;
				_obj.on('mouseover',{hexmap:this,me:_obj,region:region,pop:this.mapping.hexes[region].p},function(e){
					var rs = {'SC':'Scotland','NI':'Northern Ireland','WA':'Wales','NE':'North East','NW':'North West','YH':'Yorkshire &amp; Humber','WM':'West Midlands','EM':'East Midlands','EA':'East Anglia','LO':'London','SE':'South East','SW':'South West'};
					var lbl = e.data.hexmap.mapping.hexes[e.data.region].label;
					if(e.data.hexmap.by == "population") lbl = this.attr('title')+'<br />Population: '+e.data.pop;
					else if(e.data.hexmap.by == "party") lbl = this.attr('title')+'<br />Party: '+e.data.hexmap.data['2015'][e.data.region];
					else if(e.data.hexmap.by == "referendum") lbl = this.attr('title')+'<br />Estimated leave vote: '+(e.data.hexmap.data['referendum'][e.data.region] ? Math.round(e.data.hexmap.data['referendum'][e.data.region]*100)+'%':'unknown');
					else if(e.data.hexmap.by == "candidates"){
						lbl = this.attr('title');
						var c = e.data.hexmap.data['candidates'][e.data.region];
						for(var i = 0; i < c.length; i++){
							lbl += '<br /><strong><!--<a href="https://candidates.democracyclub.org.uk/person/'+c[i].i+'">-->'+c[i].n+'<!--</a>--></strong> - '+c[i].p;
						}
					}else lbl = this.attr('title')+'<br />Region: '+rs[e.data.hexmap.mapping.hexes[e.data.region].a];
					e.data.hexmap.label(e.data.hexmap.id,lbl);
					e.data.me.attr({'fill-opacity':0.8});//'fill':(e.data.me.selected ? colour : colour_selected)});
				}).on('mouseout',{hexmap:this,me:_obj},function(e){
					S('.infobubble').remove();
					e.data.me.attr({'fill-opacity':0.5});//{'fill':(e.data.me.selected ? e.data.me.fillcolour : colour_selected)});
				}).on('click',{hexmap:this,region:region,me:_obj},function(e){
					if(e.data.hexmap.by=="candidates"){
						location.href = "https://candidates.democracyclub.org.uk/election/parl.2017-06-08/post/WMC:"+e.data.region+"/";
					}else{
						e.data.hexmap.selectRegion(e.data.region)
						e.data.hexmap.label(e.data.hexmap.id,this.attr('title'));
						e.data.me.attr({'fill':(e.data.me.selected ? colour : colour_selected)});
					}
				});
			}
			this.hexes[region].fillcolour = getRegionColour(this.mapping.hexes[region].a);
			//this.hexes[region].fillcolour = getColour(this.mapping.hexes[region].value);
			this.hexes[region].attr({'fill-opacity':0.5,'fill':(this.hexes[region].selected ? this.hexes[region].fillcolour : colour),'stroke':'#ffffff','title':this.mapping.hexes[region].n,'data-regions':region,'style':'cursor: pointer;'});
			this.hexes[region].update();
		}
		
		if(!this.constructed) this.paper.draw();

		this.constructed = true;

		return this;
	}
	
	this.loadResults = function(type){
		if(!type) type = "2015";

		if(!this.data) this.data = {};
		this.data[type] = {};
		if(type == "referendum"){
			S().ajax('data/2016referendum-estimates.csv',{
				'complete':function(d){
					if(typeof d==="string"){
						d = d.replace(/\r/,'');
						d = d.split(/[\n]/);
					}
					for(var i = 1; i < d.length; i++){
						c = d[i].split(/,/);
						this.data[type][c[0]] = c[1];
					}
					this.setColours("referendum");
				},
				'this': this,
				'error':function(){},
				'dataType':'csv'
			});
		}else if(type == "candidates"){
			S().ajax('data/2017ge-candidates.json',{
				'complete':function(d){
					this.data[type] = d;
					this.setColours("candidates");
				},
				'this': this,
				'error':function(){},
				'dataType':'json'
			});
		}else{
			S().ajax('data/2015results.csv',{
				'complete':function(d){
					if(typeof d==="string"){
						d = d.replace(/\r/,'');
						d = d.split(/[\n]/);
					}
					for(var i = 0; i < d.length; i++){
						c = d[i].split(/,/);
						this.data[type][c[0]] = c[1];
					}
					this.setColours("party");
				},
				'this': this,
				'error':function(){},
				'dataType':'csv'
			});
		
		}
	}


	this.setColours = function(type){
		if(!type) type = "region";
		this.by = type;
		if(type == "party" && (!this.data || !this.data["2015"])) return this.loadResults("2015");
		if(type == "referendum" && (!this.data || !this.data["referendum"])) return this.loadResults("referendum");
		if(type == "candidates" && (!this.data || !this.data["candidates"])) return this.loadResults("candidates");
		for(region in this.mapping.hexes){
			if(type == "population") this.hexes[region].fillcolour = getColour(this.values[region]);
			else if(type == "party") this.hexes[region].fillcolour = getPartyColour(this.data["2015"][region]);
			else if(type == "referendum") this.hexes[region].fillcolour = getColour(1 - (this.data["referendum"][region]-0.2)/0.6);
			else if(type == "candidates") this.hexes[region].fillcolour = getCandidateColour(this.data["candidates"][region].length);
			else if(type == "region") this.hexes[region].fillcolour = getRegionColour(this.mapping.hexes[region].a);
			this.hexes[region].attr({'fill':this.hexes[region].fillcolour });
		}
		return this;
	}
	
	this.size();

	return this;
}


// Define colour routines
function Colour(c,n){
	if(!c) return {};

	function d2h(d) { return ((d < 16) ? "0" : "")+d.toString(16);}
	function h2d(h) {return parseInt(h,16);}
	/**
	 * Converts an RGB color value to HSV. Conversion formula
	 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
	 * Assumes r, g, and b are contained in the set [0, 255] and
	 * returns h, s, and v in the set [0, 1].
	 *
	 * @param   Number  r       The red color value
	 * @param   Number  g       The green color value
	 * @param   Number  b       The blue color value
	 * @return  Array           The HSV representation
	 */
	function rgb2hsv(r, g, b){
		r = r/255, g = g/255, b = b/255;
		var max = Math.max(r, g, b), min = Math.min(r, g, b);
		var h, s, v = max;
		var d = max - min;
		s = max == 0 ? 0 : d / max;
		if(max == min) h = 0; // achromatic
		else{
			switch(max){
				case r: h = (g - b) / d + (g < b ? 6 : 0); break;
				case g: h = (b - r) / d + 2; break;
				case b: h = (r - g) / d + 4; break;
			}
			h /= 6;
		}
		return [h, s, v];
	}

	this.alpha = 1;

	// Let's deal with a variety of input
	if(c.indexOf('#')==0){
		this.hex = c;
		this.rgb = [h2d(c.substring(1,3)),h2d(c.substring(3,5)),h2d(c.substring(5,7))];
	}else if(c.indexOf('rgb')==0){
		var bits = c.match(/[0-9\.]+/g);
		if(bits.length == 4) this.alpha = parseFloat(bits[3]);
		this.rgb = [parseInt(bits[0]),parseInt(bits[1]),parseInt(bits[2])];
		this.hex = "#"+d2h(this.rgb[0])+d2h(this.rgb[1])+d2h(this.rgb[2]);
	}else return {};
	this.hsv = rgb2hsv(this.rgb[0],this.rgb[1],this.rgb[2]);
	this.name = (n || "Name");
	var r,sat;
	for(r = 0, sat = 0; r < this.rgb.length ; r++){
		if(this.rgb[r] > 200) sat++;
	}
	this.text = (this.rgb[0] + this.rgb[1] + this.rgb[2] > 500 || sat > 1) ? "black" : "white";
	return this;
}
