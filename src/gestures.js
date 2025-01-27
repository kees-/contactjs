// single finger gestures
class Gesture {

	constructor (domElement, options){
		
		this.domElement = domElement;
		
		this.isActive = false;
		
		this.state = GESTURE_STATE_POSSIBLE;
		
		// the PointerEvent when the gesture has been recognized, used for some global calculations
		// it is not always reasonable to use contact.pointerdownEvent, because the user could first rotate and object, and after some time perform a pinch
		// the starting point of the pinch then is not contact.pointerdownEvent
		this.initialPointerEvent = null;
		
		this.boolParameters = {
			requiresPointerMove : null,
			requiresActivePointer : null
		}
		
		// intervals before a gesture is detected for the first time
		this.initialMinMaxParameters = {
			pointerCount : [null, null], // minimum number of fingers currently on the surface
			duration : [null, null], // ms
			currentSpeed : [null, null], // px/s
			averageSpeed : [null, null], // px/s
			finalSpeed : [null, null], // px/s
			distance : [null, null] // px
		};
		
		// intervals to use if the gesture is active
		this.activeStateMinMaxParameters = {
			pointerCount : [null, null], // minimum number of fingers currently on the surface
			duration : [null, null], // ms
			currentSpeed : [null, null], // px/s
			averageSpeed : [null, null], // px/s
			finalSpeed : [null, null], // px/s
			distance : [null, null] // px
		}
		
		let defaultOptions = {
			"bubbles" : true,
			"blocks" : [],
			"DEBUG" : false
		};

		this.options = options || {};
		
		for (let key in defaultOptions){
			if (!(key in this.options)){
				this.options[key] = defaultOptions[key];
			}
		}
		
		this.DEBUG = this.options.DEBUG;
	
	}
	
	validateMinMax (minMaxParameters, parameterName, value){
	
		var minValue = minMaxParameters[parameterName][0];
		var maxValue = minMaxParameters[parameterName][1];

		
		if (this.DEBUG == true){
			console.log("[Gestures] checking " + parameterName + "[gesture.isActive: " + this.isActive.toString() + "]" +  " minValue: " + minValue + ", maxValue: " + maxValue + ", current value: " + value);
		}
	
		if (minValue != null && value != null && value < minValue){
		
			if (this.DEBUG == true){
				console.log("dismissing min" + this.eventBaseName + ": required " + parameterName + ": " + minValue + ", current value: " + value);
			}
		
			return false;
		}
		
		if (maxValue != null && value != null && value > maxValue){
		
			if (this.DEBUG == true){
				console.log("dismissing max" + this.eventBaseName + ": required " + parameterName + ": " + maxValue + ", current value: " + value);
			}
		
			return false;
		}
		
		return true;
	
	}
	
	validateBool (parameterName, value) {
		
		// requiresPointerMove = null -> it does not matter if the pointer has been moved
		var requiredValue = this.boolParameters[parameterName];
		
		if (requiredValue != null && value != null && requiredValue === value){
			return true;
		}
		else if (requiredValue == null){
			return true;
		}
		
		if (this.DEBUG == true){
			console.log("[Gestures] dismissing " + this.eventBaseName + ": " + parameterName + " required: " + requiredValue + ", actual value: " + value);
		}
		
		return false;
		
	}
	
	getMinMaxParameters (contact) {
	
		var primaryPointerInput = contact.getPrimaryPointerInput();
	
		var minMaxParameters = {
			pointerCount : Object.keys(contact.activePointerInputs).length, 
			duration : primaryPointerInput.globalParameters.duration,
			currentSpeed : primaryPointerInput.liveParameters.speed,
			averageSpeed : primaryPointerInput.globalParameters.averageSpeed,
			finalSpeed : primaryPointerInput.globalParameters.finalSpeed,
			distance : primaryPointerInput.liveParameters.vector.vectorLength
		};
		
		return minMaxParameters;
	
	}
	
	
	getBoolParameters (contact) {
	
		var primaryPointerInput = contact.getPrimaryPointerInput();
	
		var boolParameters = {
			requiresPointerUp : primaryPointerInput.isActive === false,
			requiresActivePointer : primaryPointerInput.isActive === true,
			requiresPointerMove : primaryPointerInput.globalParameters.hasBeenMoved === true
		};
		
		return boolParameters;
	
	}
	
	validate (contact){
	
		var isValid = false;

		if (this.state == GESTURE_STATE_BLOCKED) {
			return false;
		}
		
		var primaryPointerInput = contact.getPrimaryPointerInput();
	
		if (this.DEBUG == true){
			console.log("[Gestures] running recognition for " + this.eventBaseName);
		}
		
		
		var contactBoolParameters = this.getBoolParameters(contact);
		
		for (let boolParameterName in this.boolParameters){
			let boolValue = contactBoolParameters[boolParameterName];
			isValid = this.validateBool(boolParameterName, boolValue);
			if (isValid == false){
				return false;
				//break;
			}
		}
		
		var contactMinMaxParameters = this.getMinMaxParameters(contact);
		var minMaxParameters;
		
		// check duration
		if (this.isActive == true){
			minMaxParameters = this.activeStateMinMaxParameters;
		}
		else {
			minMaxParameters = this.initialMinMaxParameters;
		}
		for (let minMaxParameterName in minMaxParameters){

			let value = contactMinMaxParameters[minMaxParameterName];
			isValid = this.validateMinMax(minMaxParameters, minMaxParameterName, value);
			if (isValid == false){
				return false;
				//break;
			}
		}
		
		// check direction
		var hasSupportedDirections = Object.prototype.hasOwnProperty.call(this.options, "supportedDirections");
		if (hasSupportedDirections == true && this.options.supportedDirections.length > 0){
			if (this.options.supportedDirections.indexOf(primaryPointerInput.liveParameters.vector.direction) == -1){
			
				if (this.DEBUG == true){
					console.log("[Gestures] dismissing " + this.eventBaseName + ": supported directions: " + this.options.supportedDirections + ", current direction: " + primaryPointerInput.liveParameters.vector.direction);
				}
				
				return false;
			
			}
		}
		
		return true;
	
	}
	
	recognize (contact) {
	
		var isValid = this.validate(contact);
		
		if (isValid == true && this.isActive == false && this.state == GESTURE_STATE_POSSIBLE){
			this.onStart(contact);
		}
		
		if (isValid == true && this.isActive == true && this.state == GESTURE_STATE_POSSIBLE){
			this.emit(contact);
		}
		else if (this.isActive == true && isValid == false){
		
			this.onEnd(contact);
		
		}
		
	}

	block (gesture) {
		if (this.options.blocks.indexOf(gesture) == -1){
			this.options.blocks.push(gesture);
		}
	}

	unblock (gesture) {
		if (this.options.blocks.indexOf(gesture) != -1){
			this.options.blocks.splice(this.options.blocks.indexOf(gesture), 1);
		}
	}
	
	blockGestures () {
		for (let g=0; g<this.options.blocks.length; g++){
			let gesture = this.options.blocks[g];
			if (gesture.isActive == false) {
				if (this.DEBUG == false){
					console.log("[Gesture] blocking " + gesture.eventBaseName);
				}
				gesture.state = GESTURE_STATE_BLOCKED;
			}
		}
	}
	
	unblockGestures () {
		for (let g=0; g<this.options.blocks.length; g++){
			let gesture = this.options.blocks[g];
			gesture.state = GESTURE_STATE_POSSIBLE;
		}
	}
	
	getEventData (contact) {
	
		// provide short-cuts to the values collected in the Contact object
		// match this to the event used by hammer.js
		var eventData = {

			contact : contact,
			recognizer : this
			
		};
		
		return eventData;
		
	}
	
	// fire events
	emit (contact, eventName) {
	
		// fire general event like "pan" , "pinch", "rotate"
		eventName = eventName || this.eventBaseName;
		
		if (this.DEBUG === true){
			console.log("[Gestures] detected and firing event " + eventName);
		}
		
		var eventData = this.getEventData(contact);
		
		var eventOptions = {
			detail: eventData,
			bubbles : this.options.bubbles
		};
		
		var event = new CustomEvent(eventName, eventOptions);
		
		var initialTarget = contact.initialPointerEvent.target;
		
		if (eventOptions.bubbles == true){
			initialTarget.dispatchEvent(event);
		}
		else {
			this.domElement.dispatchEvent(event);
		}
			
		// fire direction specific events
		var currentDirection = eventData.live.direction;

		var hasSupportedDirections = Object.prototype.hasOwnProperty.call(this.options, "supportedDirections");
		if (hasSupportedDirections == true){

			for (let d=0; d<this.options.supportedDirections.length; d++){
				let direction = this.options.supportedDirections[d];
				
				if (direction == currentDirection){
				
					let directionEventName = eventName + direction;
				
					if (this.DEBUG == true){
						console.log("[Gestures] detected and firing event " + directionEventName);
					}
					
					let directionEvent = new CustomEvent(directionEventName, eventOptions);
		
					if (eventOptions.bubbles == true){
						initialTarget.dispatchEvent(directionEvent);
					}
					else {
						this.domElement.dispatchEvent(directionEvent);
					}
					
				}
			}
		
		}
		
	}
	
	onStart (contact) {

		this.blockGestures();
	
		this.isActive = true;
		
		this.initialPointerEvent = contact.currentPointerEvent;
		
		var eventName = "" + this.eventBaseName + "start";
		
		if (this.DEBUG === true) {
			console.log("[Gestures] firing event: " + eventName);
		}
		
		// fire gestureend event
		var eventData = this.getEventData(contact);
		
		var event = new CustomEvent(eventName, { detail: eventData });
		
		this.domElement.dispatchEvent(event);
	
	}

	
	onEnd (contact) {

		this.unblockGestures();
	
		this.isActive = false;
	
		var eventName = "" + this.eventBaseName + "end";
		
		if (this.DEBUG === true) {
			console.log("[Gestures] firing event: " + eventName);
		}
		
		// fire gestureend event
		let eventData = this.getEventData(contact);
		
		var event = new CustomEvent(eventName, { detail: eventData });
		
		this.domElement.dispatchEvent(event);
	
	}

	// provide the ability to react (eg block) to touch events
	onTouchStart () {}
	onTouchMove () {}
	onTouchEnd () {}
	onTouchCancel (){}

}


class SinglePointerGesture extends Gesture {

	constructor (domElement, options) {
	
		options = options || {};
	
		super(domElement, options);
	
	}	
	
	getEventData (contact) {
	
		// provide short-cuts to the values collected in the Contact object
		// match this to the event used by hammer.js
		var eventData = super.getEventData(contact);
		
		// this should be optimized in the future, not using primaryPointerInput, but something like currentPointerInput
		var primaryPointerInput = contact.getPrimaryPointerInput();
		
		// gesture specific - dependant on the beginning of the gesture (when the gesture has initially been recognized)
		var globalStartPoint = new Point(this.initialPointerEvent.clientX, this.initialPointerEvent.clientY);
		var globalEndPoint = new Point(contact.currentPointerEvent.clientX, contact.currentPointerEvent.clientY);
		var globalVector = new Vector(globalStartPoint, globalEndPoint);
		var globalDuration = contact.currentPointerEvent.timeStamp - this.initialPointerEvent.timeStamp;
		
		// global: global for this recognizer, not the Contact object
		eventData["global"] = {
			deltaX : globalVector.x,
			deltaY : globalVector.y,
			distance: globalVector.vectorLength,
			speedX : globalVector.x / globalDuration,
			speedY : globalVector.y / globalDuration,
			speed : globalVector.vectorLength / globalDuration,
			direction : globalVector.direction,
			scale : 1,
			rotation : 0,
			srcEvent : contact.currentPointerEvent
		};
		
		eventData["live"] = {
			deltaX : primaryPointerInput.liveParameters.vector.x,
			deltaY : primaryPointerInput.liveParameters.vector.y,
			distance : primaryPointerInput.liveParameters.vector.vectorLength,
			speedX : primaryPointerInput.liveParameters.vector.x / contact.vectorTimespan,
			speedY : primaryPointerInput.liveParameters.vector.y / contact.vectorTimespan,
			speed : primaryPointerInput.liveParameters.speed,
			direction : primaryPointerInput.liveParameters.vector.direction,
			scale : 1,
			rotation : 0,
			center : {
				x : primaryPointerInput.liveParameters.vector.endPoint.x,
				y : primaryPointerInput.liveParameters.vector.endPoint.y
			},
			srcEvent : contact.currentPointerEvent/*,
			target : primaryPointerInput.touch.target,
			pointerType : ,
			eventType : ,
			isFirst : ,
			isFinal :,
			pointers : ,*/
		};
		
		return eventData;
		
	}

}

/*
* PAN DEFINITION:
*	- user touches surface with only one finger, or presses the mouse down
*	- user moves this one finger into different directions while staying on the surface, this movement is required
*	- the start of a pan is defined by a minimum pointerdown/touch duration and a minimum distance
*	- pan ends when the user removes the finger from the surface
*	- to detect a "swipe", the final speed is used
*	- a SWIPE is a pan that ended with a high speed (velocity without direction)
*	- Pan supports directions. options["supportedDirections"] = []
*/
class Pan extends SinglePointerGesture {
	
	constructor (domElement, options){
	
		options = options || {};
	
		super(domElement, options);

		this.eventBaseName = "pan";
		
		this.initialMinMaxParameters["pointerCount"] = [1,1]; // 1: no pan recognized at the pointerup event. 0: pan recognized at pointerup
		this.initialMinMaxParameters["duration"] = [0, null];
		this.initialMinMaxParameters["distance"] = [10, null]; 
		
		this.activeStateMinMaxParameters["pointerCount"] = [1,1];
		
		this.boolParameters["requiresPointerMove"] = true;
		this.boolParameters["requiresActivePointer"] = true;
		
		this.swipeFinalSpeed = 600;
		
		this.isSwipe = false;

		this.initialSupportedDirections = DIRECTION_ALL;
		
		var hasSupportedDirections = Object.prototype.hasOwnProperty.call(options, "supportedDirections");
		if (!hasSupportedDirections){
			this.options.supportedDirections = DIRECTION_ALL;
		}
		else {
			this.initialSupportedDirections = options.supportedDirections;
		}
	}
	
	validate (contact) {
		
		// on second recognition allow all directions. otherwise, the "pan" mode would end if the finger was moved right and then down during "panleft" mode
		if (this.isActive == true){
			this.options.supportedDirections = DIRECTION_ALL;
		}
		
		var isValid = super.validate(contact);
		
		return isValid;
	}
	
	onStart (contact) {
	
		this.isSwipe = false;

		super.onStart(contact);

	}
	
	// check if it was a swipe
	onEnd (contact) {
	
		var primaryPointerInput = contact.getPrimaryPointerInput();

		if (this.swipeFinalSpeed < primaryPointerInput.globalParameters.finalSpeed){
			this.isSwipe = true;
			this.emit(contact, "swipe");
		}
		
		super.onEnd(contact);

		this.options.supportedDirections = this.initialSupportedDirections;
	
	}

	onTouchMove (event) {
		if (this.isActive == true) {

			if (this.DEBUG == true){
				console.log("[Pan] preventing touchmove default");
			}

			event.preventDefault();
			event.stopPropagation();
		}
	}
}

/*
* TAP DEFINITION
* - user touches the screen with one finger or presses the mouse button down
* - the finger does not move for x ms
* - the finger is released, Tap is no recognized
*/
class Tap extends SinglePointerGesture {

	constructor (domElement, options) {
	
		options = options || {};
	
		super(domElement, options);

		this.eventBaseName = "tap";
		
		this.initialMinMaxParameters["pointerCount"] = [0,0]; // count of fingers touching the surface. a tap is fired AFTER the user removed his finger
		this.initialMinMaxParameters["duration"] = [0, 200]; // milliseconds. after a certain touch duration, it is not a TAP anymore
		
		this.initialMinMaxParameters["distance"] = [null, 30]; // if a certain distance is detected, TAP becomes impossible
		
		this.boolParameters["requiresPointerMove"] = null;
		this.boolParameters["requiresActivePointer"] = false;

	}
	
	recognize (contact) {
	
		var isValid = this.validate(contact);
		
		if (isValid == true && this.state == GESTURE_STATE_POSSIBLE){
			this.initialPointerEvent = contact.currentPointerEvent;
			this.emit(contact);
		}
		
	}

}


/*
* press should only be fired once
* if global duration is below Press.initialMinMaxParameters["duration"][0], set the Press to possible
* if global duration is above Press.initialMinMaxParameters["duration"][0] AND press already has been emitted, set Press to impossible
*
*/
class Press extends SinglePointerGesture {

	constructor (domElement, options) {
	
		options = options || {};
		
		super(domElement, options);

		this.eventBaseName = "press";
	
		this.initialMinMaxParameters["pointerCount"] = [1, 1]; // count of fingers touching the surface. a press is fired during an active contact
		this.initialMinMaxParameters["duration"] = [600, null]; // milliseconds. after a certain touch duration, it is not a TAP anymore
		
		this.initialMinMaxParameters["distance"] = [null, 10]; // if a certain distance is detected, Press becomes impossible
		
		this.boolParameters["requiresPointerMove"] = null;
		this.boolParameters["requiresActivePointer"] = true;
		
		// only Press has this parameter
		this.hasBeenEmitted = false;
		// as the global vector length is used, press should not trigger if the user moves away from the startpoint, then back, then stays
		this.hasBeenInvalidatedForContactId = null;

	}
	
	// distance has to use the global vector
	getMinMaxParameters (contact) {
	
		var minMaxParameters = super.getMinMaxParameters(contact);
		
		var primaryPointerInput = contact.getPrimaryPointerInput();
		
		minMaxParameters.distance = primaryPointerInput.globalParameters.vector.vectorLength;
		
		return minMaxParameters;
		
	}
	
	recognize (contact) {

		var isValid = this.validate(contact);

		var primaryPointerInput = contact.getPrimaryPointerInput();
		
		if (this.hasBeenInvalidatedForContactId != null && this.hasBeenInvalidatedForContactId != contact.id) {
			this.hasBeenInvalidatedForContactId = null;
		}
		
		if (isValid == false) {
			
			if (primaryPointerInput.globalParameters.vector.vectorLength > this.initialMinMaxParameters["distance"][1]){
				this.hasBeenInvalidatedForContactId = contact.id;
			}
		}
		
		if (isValid == true && this.hasBeenEmitted == false && this.hasBeenInvalidatedForContactId == null){
			
			this.initialPointerEvent = contact.currentPointerEvent;
			
			this.emit(contact);
			
			this.hasBeenEmitted = true;
			
		}
		else {
		
			let duration = primaryPointerInput.globalParameters.duration;
			
			if (this.hasBeenEmitted == true && duration <= this.initialMinMaxParameters["duration"][0]){
				this.hasBeenEmitted = false;
			}
		}
		
	}
	
	

}


class MultiPointerGesture extends Gesture {

	
	constructor (domElement, options) {
	
		options = options || {};
	
		super(domElement, options);
		
		this.boolParameters = {
			requiresPointerMove : null,
			requiresActivePointer : null
		}
	
		this.initialMinMaxParameters = {
			pointerCount : [2, null]
		};
		
		this.activeStateMinMaxParameters = {
			pointerCount : [2, null]
		};
		
		this.options = options || {};
	
	}
	
}

class TwoPointerGesture extends MultiPointerGesture {

	constructor (domElement, options) {
	
		options = options || {};
	
		super(domElement, options);
		
		this.boolParameters.requiresPointerMove = true;
		this.boolParameters.requiresActivePointer = true;
	
		this.initialMinMaxParameters["pointerCount"] = [2, 2]; // minimum number of fingers currently on the surface
		this.initialMinMaxParameters["centerMovement"] = [null,null]; //px
		this.initialMinMaxParameters["distanceChange"] = [null, null]; //px - distance between 2 fingers
		this.initialMinMaxParameters["rotationAngle"] = [null, null]; // degrees: positive = clockwise, negative = counter-clockwise (js convention, not mathematical convention)
		this.initialMinMaxParameters["vectorAngle"] = [null, null];
		
		this.activeStateMinMaxParameters["pointerCount"] = [2, 2]; 
		this.activeStateMinMaxParameters["centerMovement"] = [null,null];
		this.activeStateMinMaxParameters["distanceChange"] = [null, null];
		this.activeStateMinMaxParameters["rotationAngle"] = [null, null];
		this.activeStateMinMaxParameters["vectorAngle"] = [null, null];
	
	}
	
	getMinMaxParameters (contact) {
	
		var minMaxParameters = super.getMinMaxParameters(contact);
		
		minMaxParameters.centerMovement = contact.multipointer.liveParameters.centerMovement;
		// negative distance change: distance was decreased, positive: distance was increased.
		minMaxParameters.distanceChange = Math.abs(contact.multipointer.liveParameters.distanceChange);
		
		minMaxParameters.rotationAngle = Math.abs(contact.multipointer.liveParameters.rotationAngle);
		
		minMaxParameters.vectorAngle = contact.multipointer.liveParameters.vectorAngle;
		
		return minMaxParameters;
		
	}
	
	getEventData (contact) {
	
		// provide short-cuts to the values collected in the Contact object
		// match this to the event used by hammer.js
		var eventData = super.getEventData(contact);
		
		var globalDuration = contact.currentPointerEvent.timeStamp - this.initialPointerEvent.timeStamp;
		var globalParameters = contact.multipointer.globalParameters;
		var liveParameters = contact.multipointer.liveParameters;
		
		// global: global for this recognizer, not the Contact object
		eventData["global"] = {
			deltaX : globalParameters.centerMovementVector.x,
			deltaY : globalParameters.centerMovementVector.y,
			distance: globalParameters.centerMovement,
			speedX : globalParameters.centerMovementVector.x / globalDuration,
			speedY : globalParameters.centerMovementVector.y / globalDuration,
			speed : globalParameters.centerMovementVector.vectorLength / globalDuration,
			direction : globalParameters.centerMovementVector.direction,
			scale : globalParameters.relativeDistanceChange,
			rotation : globalParameters.rotationAngle,
			srcEvent : contact.currentPointerEvent
		};
		
		eventData["live"] = {
			deltaX : liveParameters.centerMovementVector.x,
			deltaY : liveParameters.centerMovementVector.y,
			distance: liveParameters.centerMovement,
			speedX : liveParameters.centerMovementVector.x / globalDuration,
			speedY : liveParameters.centerMovementVector.y / globalDuration,
			speed : liveParameters.centerMovementVector.vectorLength / globalDuration,
			direction : liveParameters.centerMovementVector.direction,
			scale : liveParameters.relativeDistanceChange,
			rotation : liveParameters.rotationAngle,
			center : {
				x : liveParameters.centerMovementVector.startPoint.x,
				y : liveParameters.centerMovementVector.startPoint.y
			},
			srcEvent : contact.currentPointerEvent
		};
		
		return eventData;
		
	}

}

/*
* PINCH DEFINITION
* - 2 fingers touch the surface
* - those fongers are moved towards each other, or away from each other
* - 2 fingers define a circle: center=middle between two touches, diameter = distance
* - the center between the 2 fingers stays at the same coordinates
* - the distance between the 2 start points and the two end points is reduces (diameter shrinks)
*/
class Pinch extends TwoPointerGesture {

	constructor (domElement, options) {
	
		options = options || {};
	
		super(domElement, options);

		this.eventBaseName = "pinch";
		
		this.initialMinMaxParameters["centerMovement"] = [0, 50]; //px
		this.initialMinMaxParameters["distanceChange"] = [5, null]; // distance between 2 fingers
		this.initialMinMaxParameters["rotationAngle"] = [null, 20]; // distance between 2 fingers
		this.initialMinMaxParameters["vectorAngle"] = [10, null];
		
		
	}

}


/*
* ROTATE DEFINITION
* - 2 fingers touch the surface
* - 1 or 2 fingers are moved in a circular motion. the center is between the 2 fingers
*/

class Rotate extends TwoPointerGesture {

	constructor (domElement, options) {
	
		options = options || {};
	
		super(domElement, options);

		this.eventBaseName = "rotate";
		
		this.initialMinMaxParameters["centerMovement"] = [0, 50];
		this.initialMinMaxParameters["distanceChange"] = [null, 50];
		this.initialMinMaxParameters["rotationAngle"] = [5, null];

	}

}


/*
* 2 fingers are moved across the surface, in the same direction
*/
class TwoFingerPan extends TwoPointerGesture {

	constructor (domElement, options) {
	
		options = options || {};
	
		super(domElement, options);

		this.eventBaseName = "twofingerpan";
		
		this.initialMinMaxParameters["centerMovement"] = [3, null];
		this.initialMinMaxParameters["distanceChange"] = [null, 50];
		this.initialMinMaxParameters["rotationAngle"] = [null, null];
		this.initialMinMaxParameters["vectorAngle"] = [null, 150];

	}

}
