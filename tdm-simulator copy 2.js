document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const numDevicesInput = document.getElementById('numDevices');
    const deviceInputsDiv = document.getElementById('device-inputs');
    const setupBtn = document.getElementById('setupBtn');
    const stepBtn = document.getElementById('stepBtn');
    const prevBtn = document.getElementById('prevBtn'); // New previous button
    const speedSelect = document.getElementById('simulationSpeed');
    const inputDevicesDiv = document.getElementById('inputDevices');
    const outputDevicesDiv = document.getElementById('outputDevices');
    const tdmFrameDiv = document.getElementById('tdm-frame');
    const currentMuxState = document.getElementById('current-mux-state');
    const currentDemuxState = document.getElementById('current-demux-state');
    
    // Simulation variables
    // Add these to your simulation variables section
    let baseTransmissionTime = 1; // Base time T in seconds
    let totalFrames = 0;
    let slotTime = 0;
    let frameTime = 0;
    let devices = [];
    let tdmFrame = [];
    let currentStep = 0;
    let simulationSpeed = parseInt(speedSelect.value);
    let animationInProgress = false;
    
    // Animation durations based on speed selection
    const getAnimationSpeeds = () => {
        const speedValue = parseInt(speedSelect.value);
        const factor = speedValue / 1000; // Normalize to medium speed
        
        return {
            frameToMux: 800 * factor,
            muxProcessing: 500 * factor,
            tdmHighlight: 500 * factor,
            tdmToDemux: 800 * factor,
            demuxProcessing: 500 * factor,
            demuxToDevice: 500 * factor,
        };
    };
    
    // Device colors
    const deviceColors = [
        '#4361ee', '#3a0ca3', '#f72585', '#4cc9f0',
        '#4895ef', '#560bad', '#b5179e', '#7209b7'
    ];
    
    // Device icons
    const deviceIcons = [
        '💻', '📱', '🖥️', '⌚', '📠', '🖨️', '📡', '🎮'
    ];
    
    // Initialize the setup
    function init() {
        setupBtn.addEventListener('click', setupDevices);
        stepBtn.addEventListener('click', () => stepSimulation('forward'));
        if (prevBtn) prevBtn.addEventListener('click', () => stepSimulation('backward'));
        speedSelect.addEventListener('change', updateSimulationSpeed);
        numDevicesInput.addEventListener('change', updateDeviceInputs);
        
        updateDeviceInputs();
    }
    
    function updateSimulationSpeed() {
        simulationSpeed = parseInt(speedSelect.value);
        console.log("Speed updated to:", simulationSpeed);
    }
    
    // Update device input fields based on the number of devices
    function updateDeviceInputs() {
        const numDevices = parseInt(numDevicesInput.value);
        deviceInputsDiv.innerHTML = '';

        const tTimeInput = document.createElement('div');
        tTimeInput.className = 'device-input';
        tTimeInput.innerHTML = `
            <label for="baseTime">T (sec):</label>
            <input type="number" id="baseTime" min="0.1" step="0.1" value="${baseTransmissionTime}" style="width: 60px;" />
        `;
        deviceInputsDiv.appendChild(tTimeInput);
        
        for (let i = 0; i < numDevices; i++) {
            const deviceInput = document.createElement('div');
            deviceInput.className = 'device-input';
            deviceInput.innerHTML = `
                ${String.fromCharCode(65 + i)}:
                <input type="text" id="device${i}" placeholder="Data" 
                       value="${String.fromCharCode(65 + i).repeat(i+2)}" />
            `;
            deviceInputsDiv.appendChild(deviceInput);
        }
    }
    
    // Setup devices based on user input
    function setupDevices() {
        const numDevices = parseInt(numDevicesInput.value);
        if (numDevices < 2 || numDevices > 8) {
            alert("Please enter a number of devices between 2 and 8");
            return;
        }

        const baseTimeInput = document.getElementById('baseTime');
        if (baseTimeInput) {
            baseTransmissionTime = parseFloat(baseTimeInput.value) || 1;
        }
        
        // Reset simulation but maintain device configuration
        resetSimulation();
        
        // Create devices
        devices = [];
        for (let i = 0; i < numDevices; i++) {
            const inputElement = document.getElementById(`device${i}`);
            const frames = inputElement.value.trim();
            
            if (!frames) {
                alert(`Please enter frames for Device ${String.fromCharCode(65 + i)}`);
                return;
            }
            
            devices.push({
                id: i,
                name: String.fromCharCode(65 + i),
                frames: frames.split(''),
                color: deviceColors[i],
                icon: deviceIcons[i],
                outputFrames: []
            });
        }
        
        // Create TDM frame
        createTDMFrame();
    
        // Calculate timing metrics
        calculateTimingMetrics();
        
        // Render devices
        renderDevices();
        
        // Display timing metrics
        displayTimingMetrics();
        
        // Update UI
        stepBtn.disabled = false;
        prevBtn.disabled = true; // Initially disabled since we're at step 0
        currentMuxState.textContent = "Ready to start";
        currentDemuxState.textContent = "Ready to start";
    }
    
    // Create the TDM frame
    function createTDMFrame() {
        tdmFrame = [];
        let maxFrameLength = 0;
        
        // Find the longest frame length
        for (const device of devices) {
            maxFrameLength = Math.max(maxFrameLength, device.frames.length);
        }
        
        // Create the TDM frame slots
        for (let i = 0; i < maxFrameLength; i++) {
            const frameSlot = [];
            for (let j = 0; j < devices.length; j++) {
                if (i < devices[j].frames.length) {
                    frameSlot.push({
                        deviceId: j,
                        content: devices[j].frames[i]
                    });
                } else {
                    frameSlot.push({
                        deviceId: j,
                        content: '' // Empty slot
                    });
                }
            }
            tdmFrame.push(frameSlot);
        }
    }
    
    // Render devices in the UI
    function renderDevices() {
        // Clear previous devices
        inputDevicesDiv.innerHTML = '';
        outputDevicesDiv.innerHTML = '';
        
        // Render input devices
        for (const device of devices) {
            const deviceDiv = document.createElement('div');
            deviceDiv.className = 'device';
            deviceDiv.innerHTML = `
                    <div class="device-header">
                    <div class="device-icon" style="background-color: ${device.color}">${device.icon}</div>
                    <h3>Device ${device.name}</h3>
                </div>
                <div class="frames-container" id="input-device-${device.id}">
                    ${device.frames.map((frame, index) => 
                        `<div class="frame" style="background-color: ${device.color}" 
                            data-device="${device.id}" data-index="${index}">${frame}</div>`
                    ).join('')}
                </div>
                <div class="device-status">
                    Status: Ready<br>
                    Original Time: ${device.originalTime.toFixed(2)}s<br>
                    TDM Time: ${device.tdmTime.toFixed(2)}s
                </div>
            `;
            inputDevicesDiv.appendChild(deviceDiv);
            
            // Create output device (only once during setup)
            const outputDeviceDiv = document.createElement('div');
            outputDeviceDiv.className = 'device';
            outputDeviceDiv.innerHTML = `
                <div class="device-header">
                    <div class="device-icon" style="background-color: ${device.color}">${device.icon}</div>
                    <h3>Device ${device.name}</h3>
                </div>
                <div class="frames-container" id="output-device-${device.id}"></div>
                <div class="device-status">Status: Waiting</div>
            `;
            outputDevicesDiv.appendChild(outputDeviceDiv);
        }
        
        // Render TDM frame
        renderTDMFrame();
    }
    
    // Render the TDM frame in the UI
    function renderTDMFrame() {
        tdmFrameDiv.innerHTML = '';
        const tdmTimingHeader = document.createElement('div');
        tdmTimingHeader.className = 'tdm-timing-header';
        tdmTimingHeader.innerHTML = `
            <p>Each frame duration: ${frameTime.toFixed(3)}s</p>
            <p>Each slot duration: ${slotTime.toFixed(3)}s</p>
        `;
        tdmFrameDiv.appendChild(tdmTimingHeader);
        
        for (let i = 0; i < tdmFrame.length; i++) {
            const frameSlotDiv = document.createElement('div');
            frameSlotDiv.className = 'tdm-frame';
            if (i === currentStep && currentStep < tdmFrame.length) frameSlotDiv.classList.add('active');
            
            frameSlotDiv.innerHTML = `
                <div class="frame-label">
                    Frame ${i+1}<br>
                    <span class="frame-time">${frameTime.toFixed(3)}s</span>
                </div>
                <div class="slots-container">
                    ${tdmFrame[i].map(slot => 
                        `<div class="slot" style="background-color: ${slot.content ? devices[slot.deviceId].color : '#e9ecef'}; 
                        color: ${slot.content ? 'white' : '#6c757d'}"
                        data-device="${slot.deviceId}" 
                        data-frame="${i}">
                            ${slot.content || '—'}
                            <span class="slot-time">${slotTime.toFixed(3)}s</span>
                        </div>`
                    ).join('')}
                </div>
            `;
            tdmFrameDiv.appendChild(frameSlotDiv);
        }
    }
    
    // Step through the simulation (forward or backward)
    async function stepSimulation(direction) {
        if (animationInProgress) return;
        
        // Handle direction validations
        if (direction === 'forward' && currentStep >= tdmFrame.length) {
            return;
        }
        
        if (direction === 'backward' && currentStep <= 0) {
            return;
        }
        
        animationInProgress = true;
        
        // Disable buttons during animation
        setupBtn.disabled = true;
        stepBtn.disabled = true;
        prevBtn.disabled = true;
        
        if (direction === 'backward') {
            await handlePreviousStep();
        } else {
            await handleNextStep();
        }
        
        // Update buttons state
        setupBtn.disabled = false;
        stepBtn.disabled = currentStep >= tdmFrame.length;
        prevBtn.disabled = currentStep <= 0;
        
        animationInProgress = false;
    }
    
    // Handle moving back to previous step
    async function handlePreviousStep() {
        currentStep--;
        
        // Remove latest frame from each output device
        for (let i = 0; i < devices.length; i++) {
            if (devices[i].outputFrames.length > 0) {
                devices[i].outputFrames.pop();
                
                // Update device output displays
                const outputFramesContainer = document.querySelector(`#output-device-${i}`);
                if (outputFramesContainer && outputFramesContainer.lastChild) {
                    outputFramesContainer.removeChild(outputFramesContainer.lastChild);
                }
                
                // Update device status
                const outputDeviceStatus = document.querySelector(`#output-device-${i}`)?.parentNode?.querySelector('.device-status');
                if (outputDeviceStatus) {
                    outputDeviceStatus.textContent = 
                        currentStep < devices[i].frames.length ? 
                        `Receiving (${devices[i].outputFrames.length}/${devices[i].frames.length})` : 
                        'Complete';
                }
            }
        }
        
        // Update input device status
        const inputDeviceStatuses = inputDevicesDiv.querySelectorAll('.device-status');
        for (let i = 0; i < inputDeviceStatuses.length; i++) {
            if (currentStep < devices[i].frames.length) {
                inputDeviceStatuses[i].textContent = `Status: Sending (${currentStep}/${devices[i].frames.length})`;
            } else {
                inputDeviceStatuses[i].textContent = `Status: Complete`;
            }
        }
        
        // Update TDM frame display
        const tdmFrameDivs = tdmFrameDiv.querySelectorAll('.tdm-frame');
        tdmFrameDivs.forEach((div, index) => {
            if (index === currentStep) {
                div.classList.add('active');
            } else {
                div.classList.remove('active');
            }
        });
        
        // Update MUX and DEMUX status
        if (currentStep < tdmFrame.length) {
            currentMuxState.innerHTML = `<strong>Ready for Frame ${currentStep+1}</strong>`;
            currentDemuxState.innerHTML = `<strong>Ready for Frame ${currentStep+1}</strong>`;
        } else {
            currentMuxState.textContent = "Simulation complete";
            currentDemuxState.textContent = "Simulation complete";
        }
    }
    
    // Handle moving to next step with animation
    async function handleNextStep() {
        const currentFrame = tdmFrame[currentStep];
        const speed = getAnimationSpeeds();
        
        // Highlight current frame in TDM view
        const tdmFrameDivs = tdmFrameDiv.querySelectorAll('.tdm-frame');
        tdmFrameDivs.forEach((div, index) => {
            if (index === currentStep) {
                div.classList.add('active');
            } else {
                div.classList.remove('active');
            }
        });

        // 1. Show frames moving from input devices to MUX
        currentMuxState.innerHTML = `<strong>Receiving Frame ${currentStep+1}</strong><br>`;
        
        // Create temporary elements for animation
        const tempFrames = [];
        for (let i = 0; i < devices.length; i++) {
            const inputFrame = document.querySelector(`.frame[data-device="${i}"][data-index="${currentStep}"]`);
            if (inputFrame && currentFrame[i].content) {
                const tempFrame = inputFrame.cloneNode(true);
                tempFrame.style.position = 'absolute';
                tempFrame.style.left = `${inputFrame.getBoundingClientRect().left}px`;
                tempFrame.style.top = `${inputFrame.getBoundingClientRect().top}px`;
                tempFrame.classList.add('frame-transmitting');
                document.body.appendChild(tempFrame);
                tempFrames.push({
                    element: tempFrame,
                    deviceId: i,
                    content: currentFrame[i].content
                });
                
                // Animate to MUX
                const muxCard = document.querySelector('.mux-card');
                const muxRect = muxCard.getBoundingClientRect();
                const targetX = muxRect.left + muxRect.width/2;
                const targetY = muxRect.top + muxRect.height/2;
                
                tempFrame.animate([
                    { 
                        transform: 'translate(0, 0) scale(1)',
                        opacity: 1
                    },
                    { 
                        transform: `translate(${targetX - inputFrame.getBoundingClientRect().left}px, ${targetY - inputFrame.getBoundingClientRect().top}px) scale(0.5)`,
                        opacity: 0.8
                    }
                ], {
                    duration: speed.frameToMux,
                    easing: 'ease-in'
                });
                
                // Update MUX state display
                currentMuxState.innerHTML += 
                    `<span style="color:${devices[i].color}">${devices[i].icon} Device ${devices[i].name}: ` +
                    `<span class="mux-processing">${currentFrame[i].content || 'Empty'}</span></span><br>`;
            }
        }

        // Wait for first animation to complete
        await new Promise(resolve => setTimeout(resolve, speed.frameToMux));

        // Remove temporary frames
        tempFrames.forEach(temp => temp.element.remove());

        // 2. Highlight MUX processing
        currentMuxState.innerHTML = `<strong>Multiplexing Frame ${currentStep+1}</strong><br>`;
        const muxCard = document.querySelector('.mux-card');
        muxCard.classList.add('mux-processing');

        // Wait for MUX animation
        await new Promise(resolve => setTimeout(resolve, speed.muxProcessing));

        // 3. Highlight TDM slot
        const currentTdmSlots = tdmFrameDivs[currentStep].querySelectorAll('.slot');
        currentTdmSlots.forEach(slot => {
            if (slot.textContent !== '—') {
                slot.classList.add('tdm-slot-highlight');
            }
        });

        currentMuxState.innerHTML = `<strong>Transmitting Frame ${currentStep+1}</strong><br>`;
        
        // Wait for TDM highlight
        await new Promise(resolve => setTimeout(resolve, speed.tdmHighlight));

        // 4. Show frames moving from TDM to DEMUX
        currentDemuxState.innerHTML = `<strong>Receiving Frame ${currentStep+1}</strong><br>`;
        
        // Animate from TDM to DEMUX
        const demuxAnimations = [];
        currentTdmSlots.forEach((slot, i) => {
            if (slot.textContent !== '—') {
                const tempSlot = slot.cloneNode(true);
                tempSlot.style.position = 'absolute';
                tempSlot.style.left = `${slot.getBoundingClientRect().left}px`;
                tempSlot.style.top = `${slot.getBoundingClientRect().top}px`;
                tempSlot.classList.add('tdm-to-demux');
                document.body.appendChild(tempSlot);
                
                const demuxCard = document.querySelector('.demux-card');
                const demuxRect = demuxCard.getBoundingClientRect();
                const targetX = demuxRect.left + demuxRect.width/2;
                const targetY = demuxRect.top + demuxRect.height/2;
                
                const animation = tempSlot.animate([
                    { 
                        transform: 'translate(0, 0) scale(1)',
                        opacity: 1
                    },
                    { 
                        transform: `translate(${targetX - slot.getBoundingClientRect().left}px, ${targetY - slot.getBoundingClientRect().top}px) scale(0.5)`,
                        opacity: 0.8
                    }
                ], {
                    duration: speed.tdmToDemux,
                    easing: 'ease-out'
                });
                
                demuxAnimations.push(animation);
                
                currentDemuxState.innerHTML += 
                    `<span style="color:${devices[i].color}">${devices[i].icon} Device ${devices[i].name}: ` +
                    `<span class="demux-processing">${slot.textContent}</span></span><br>`;
            }
        });

        // Wait for TDM to DEMUX animation
        await new Promise(resolve => setTimeout(resolve, speed.tdmToDemux));
        
        // Clean up temporary slot elements
        document.querySelectorAll('.tdm-to-demux').forEach(el => el.remove());

        // 5. Show frames arriving at output devices
        currentDemuxState.innerHTML = `<strong>Distributing Frame ${currentStep+1}</strong><br>`;
        const demuxCard = document.querySelector('.demux-card');
        demuxCard.classList.add('demux-processing');

        // Update output devices with all received frames up to current step
        for (let i = 0; i < devices.length; i++) {
            // Only add frame if it exists in the input and we haven't processed it yet
            if (currentStep < devices[i].frames.length && currentFrame[i].content) {
                devices[i].outputFrames.push(currentFrame[i].content);
                
                // Find the existing output frames container
                const outputFramesContainer = document.querySelector(`#output-device-${i}`);
                if (outputFramesContainer) {
                    // Create new frame element with receiving animation
                    const newFrame = document.createElement('div');
                    newFrame.className = 'frame frame-receiving';
                    newFrame.style.backgroundColor = devices[i].color;
                    newFrame.textContent = currentFrame[i].content;
                    
                    // Get position of demux card for animation
                    const demuxRect = demuxCard.getBoundingClientRect();
                    const outputRect = outputFramesContainer.getBoundingClientRect();
                    
                    // Set initial position (from demux)
                    newFrame.style.position = 'absolute';
                    newFrame.style.left = `${demuxRect.left}px`;
                    newFrame.style.top = `${demuxRect.top}px`;
                    document.body.appendChild(newFrame);
                    
                    // Animate to output device
                    newFrame.animate([
                        { 
                            transform: 'translate(0, 0) scale(0.5)',
                            opacity: 0.8
                        },
                        { 
                            transform: `translate(${outputRect.left - demuxRect.left}px, ${outputRect.top - demuxRect.top}px) scale(1)`,
                            opacity: 1
                        }
                    ], {
                        duration: speed.demuxToDevice,
                        easing: 'ease-out'
                    }).onfinish = () => {
                        // Move to final position in output container
                        newFrame.style.position = '';
                        newFrame.style.left = '';
                        newFrame.style.top = '';
                        outputFramesContainer.appendChild(newFrame);
                    };
                }
            }
            
            // Update device status
            const outputDeviceStatus = document.querySelector(`#output-device-${i}`)?.parentNode?.querySelector('.device-status');
            if (outputDeviceStatus) {
                outputDeviceStatus.textContent = 
                    currentStep < devices[i].frames.length ? 
                    `Receiving (${devices[i].outputFrames.length}/${devices[i].frames.length})` : 
                    'Complete';
            }
            
            currentDemuxState.innerHTML += 
                `<span style="color:${devices[i].color}">${devices[i].icon} Device ${devices[i].name}: ` +
                `${currentFrame[i].content || 'Empty'}</span><br>`;
        }

        // Wait for final animation
        await new Promise(resolve => setTimeout(resolve, speed.demuxToDevice + 200)); // Add extra delay

        // Update input device status
        const inputDeviceStatuses = inputDevicesDiv.querySelectorAll('.device-status');
        for (let i = 0; i < devices.length; i++) {
            if (currentStep < devices[i].frames.length) {
                inputDeviceStatuses[i].textContent = `Status: Sending (${currentStep+1}/${devices[i].frames.length})`;
            } else {
                inputDeviceStatuses[i].textContent = `Status: Complete`;
            }
        }

        // Clean up animation classes
        document.querySelectorAll('.frame-transmitting, .mux-processing, .tdm-slot-highlight, .demux-processing')
        .forEach(el => {
            el.classList.remove('frame-transmitting');
            el.classList.remove('mux-processing');
            el.classList.remove('tdm-slot-highlight');
            el.classList.remove('demux-processing');
        });

        // Increment step
        currentStep++;
    }
    
    // Reset the simulation
    function resetSimulation() {
        // Reset variables
        currentStep = 0;
        devices.forEach(device => {
            device.outputFrames = [];
        });
        
        // Reset UI
        stepBtn.disabled = true;
        prevBtn.disabled = true;
        inputDevicesDiv.innerHTML = '';
        outputDevicesDiv.innerHTML = '';
        tdmFrameDiv.innerHTML = '';
        currentMuxState.textContent = "Waiting for setup...";
        currentDemuxState.textContent = "Waiting for setup...";
    }

    // Calculate timing metrics based on device configuration
    function calculateTimingMetrics() {
        // Calculate slot time (T/N where N is number of devices)
        slotTime = baseTransmissionTime / devices.length;
        
        // Calculate frame time (equal to base time T)
        frameTime = baseTransmissionTime;
        
        // Calculate total number of frames
        let maxFrameLength = 0;
        for (const device of devices) {
            maxFrameLength = Math.max(maxFrameLength, device.frames.length);
        }
        totalFrames = maxFrameLength;
        
        // Calculate device-specific metrics
        for (let i = 0; i < devices.length; i++) {
            devices[i].originalTime = devices[i].frames.length * baseTransmissionTime;
            devices[i].tdmTime = totalFrames * frameTime;
            devices[i].efficiency = (devices[i].frames.length / totalFrames) * 100;
        }
    }

    // Display timing metrics in the UI
    function displayTimingMetrics() {
        // Create metrics card
        const metricsCard = document.createElement('div');
        metricsCard.className = 'mux-card timing-metrics';
        metricsCard.innerHTML = `
            <div class="card-header">
                <div class="card-icon">TIMING METRICS</div>
            </div>
            <div class="card-body">
                <p><strong>Base Transmission Time (T):</strong> ${baseTransmissionTime} second(s)</p>
                <p><strong>Number of Devices:</strong> ${devices.length}</p>
                <p><strong>Slot Time (T/${devices.length}):</strong> ${slotTime.toFixed(3)} second(s)</p>
                <p><strong>Frame Time:</strong> ${frameTime.toFixed(3)} second(s)</p>
                <p><strong>Total Frames:</strong> ${totalFrames}</p>
                <p><strong>Total Transmission Time:</strong> ${(totalFrames * frameTime).toFixed(3)} second(s)</p>
                <hr>
                <h4>Device Efficiency:</h4>
                <ul>
                    ${devices.map(device => 
                        `<li style="color:${device.color}">
                            Device ${device.name}: 
                            ${device.frames.length} frames / ${totalFrames} total = 
                            ${device.efficiency.toFixed(1)}% efficiency
                        </li>`
                    ).join('')}
                </ul>
            </div>
        `;
        
        // Add to the processing section, before the TDM frame
        const processingSection = document.querySelector('.processing-section');
        const tdmSection = document.querySelector('.tdm-section');
        processingSection.insertBefore(metricsCard, tdmSection);
    }

    init();
});