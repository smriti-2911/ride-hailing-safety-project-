export const SCENARIOS = {
  SMOOTH_SAFE_RIDE: 'Smooth Safe Ride',
  TRAFFIC_DELAY: 'Traffic Delay Scenario',
  MINOR_DEVIATION: 'Minor Deviation + Recovery',
  SUSTAINED_DEVIATION: 'Sustained Deviation',
  SUSPICIOUS_STOP: 'Suspicious Stop',
  SOS_SCENARIO: 'SOS Emergency'
};

export class AuthenticGPSSimulator {
  constructor(routeCoords, onPing, onComplete, scenario = null) {
    this.routeCoords = routeCoords;
    this.onPing = onPing;
    this.onComplete = onComplete;
    this.currentStep = 0;
    this.timerId = null;
    
    // Select scenario randomly if none provided
    const scenarios = Object.values(SCENARIOS);
    this.scenario = scenario || scenarios[Math.floor(Math.random() * scenarios.length)];
    
    // Internal state tracking
    this.state = {
      isDeviated: false,
      isStopped: false,
      deviationDistance: 0,
      pauseCount: 0, // pings to stay paused
      eventStarted: false,
      eventResolved: false
    };
  }

  start() {
    this.currentStep = 0;
    console.log(`[Simulator] Starting Scenario: ${this.scenario}`);
    this.scheduleNextPing();
  }

  stop() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  scheduleNextPing = () => {
    if (this.currentStep >= this.routeCoords.length - 1) {
      if (this.onComplete) this.onComplete();
      return;
    }

    let delayMs = 2500;
    let increment = 1;

    // Detect 20% point for trigger
    const triggerIndex = Math.floor(this.routeCoords.length * 0.20);
    const stopTriggerIndex = Math.floor(this.routeCoords.length * 0.30);

    // Apply Scenario Logic
    if (this.scenario === SCENARIOS.TRAFFIC_DELAY) {
      if (this.currentStep >= triggerIndex && this.currentStep <= triggerIndex + 10) {
        delayMs = 6000; // Crawl significantly
      }
    } 
    else if (this.scenario === SCENARIOS.SUSPICIOUS_STOP) {
      if (this.currentStep === stopTriggerIndex && !this.state.eventResolved) {
        if (!this.state.eventStarted) {
          this.state.eventStarted = true;
          this.state.pauseCount = 14; // Pause for 14 pings (35 seconds)
        }
        if (this.state.pauseCount > 0) {
          increment = 0;
          this.state.pauseCount--;
        } else {
          this.state.eventResolved = true;
        }
      }
    }
    else if (this.scenario === SCENARIOS.MINOR_DEVIATION) {
      if (this.currentStep >= triggerIndex && !this.state.eventResolved) {
        if (!this.state.eventStarted) {
          this.state.eventStarted = true;
          this.state.isDeviated = true;
          this.state.pauseCount = 3; // Hold deviation for 3 pings (7.5 seconds)
        }
        
        if (this.state.pauseCount > 0) {
          this.state.deviationDistance = 0.0008; // ~85 meters (off route, triggers minor)
          increment = 0; // stop route progression while deviated
          this.state.pauseCount--;
        } else {
          // Recover
          this.state.isDeviated = false;
          this.state.deviationDistance = 0;
          this.state.eventResolved = true;
        }
      }
    }
    else if (this.scenario === SCENARIOS.SUSTAINED_DEVIATION) {
      if (this.currentStep >= triggerIndex && !this.state.eventResolved) {
        if (!this.state.eventStarted) {
          this.state.eventStarted = true;
          this.state.isDeviated = true;
          this.state.pauseCount = 8; // Hold deviation for 8 pings (20 seconds)
        }
        
        if (this.state.pauseCount > 0) {
          this.state.deviationDistance = 0.0008; // ~85 meters 
          increment = 0; 
          this.state.pauseCount--;
        } else {
          this.state.isDeviated = false;
          this.state.deviationDistance = 0;
          this.state.eventResolved = true;
        }
      }
    }
    else if (this.scenario === SCENARIOS.SOS_SCENARIO) {
      if (this.currentStep >= triggerIndex) {
        this.state.isDeviated = true;
        this.state.deviationDistance += 0.0002; // Progressively pull away indefinitely
        if (this.state.deviationDistance > 0.002) {
          increment = 0; // Stop eventually
        }
      }
    }

    this.timerId = setTimeout(() => {
      this.currentStep = Math.min(this.currentStep + increment, this.routeCoords.length - 1);
      
      let lat = this.routeCoords[this.currentStep][0];
      let lng = this.routeCoords[this.currentStep][1];
      
      if (this.state.isDeviated) {
          lat += this.state.deviationDistance;
          lng += this.state.deviationDistance;
      }

      const newLoc = [lat, lng];

      if (this.onPing) {
        this.onPing(newLoc, { scenario: this.scenario });
      }

      this.scheduleNextPing();
    }, delayMs);
  }
}
