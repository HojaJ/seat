class AdvancedTheatreSeatBuilder {
    constructor(seats) {
        this.seats = seats; // Store seats data
        this.canvas = new fabric.Canvas('seat-canvas', {
            width: 2500,
            height: 800,
            backgroundColor: '#ffffff'
        });
        
        this.currentRow = 'A';
        this.currentSeatNumber = 1;
        this.seatSize = 25;  // Smaller seats
        this.gridSize = 35;  // More space between seats
        
        // Calculate center positions
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        
        // Set starting Y position to be 100px from top for better visibility
        this.startY = 100;
        this.currentY = this.startY;
        
        this.initializeEventListeners();
        
        // Initialize seats layout
        this.initializeSeatsLayout();
        
        // Add keyboard event listener for delete key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                this.removeSelectedSeats();
            }
        });

        this.canvas.on('object:moving', (e) => this.constrainMovement(e));
        this.canvas.on('selection:created', () => this.enforceLocking());
        this.canvas.on('selection:updated', () => this.enforceLocking());
    }

    initializeEventListeners() {
        document.getElementById('add-seat').addEventListener('click', () => this.addSingleSeat());
        document.getElementById('add-row').addEventListener('click', () => this.addRow());
        document.getElementById('save-layout').addEventListener('click', () => this.saveLayout());
        document.getElementById('clear-canvas').addEventListener('click', () => this.clearCanvas());
        document.getElementById('add-screen').addEventListener('click', () => this.addScreen());
        document.getElementById('load-layout').addEventListener('click', () => this.loadLayout());

        // Add selection event to update UI
        this.canvas.on('selection:created', () => this.handleSelection());
        this.canvas.on('selection:updated', () => this.handleSelection());
        this.canvas.on('selection:cleared', () => this.handleSelectionCleared());

        // Add new alignment buttons to the tools panel
        const alignmentDiv = document.createElement('div');
        alignmentDiv.className = 'mb-3';
        alignmentDiv.innerHTML = `
            <div class="btn-group w-100">
                <button id="align-horizontal" class="btn btn-outline-primary">Horizontal</button>
            </div>
        `;
        
        // Insert alignment controls before the save button
        // toolsPanel.insertBefore(alignmentDiv, document.getElementById('save-layout').parentNode);

        // Add event listeners for alignment buttons
        // document.getElementById('align-horizontal').addEventListener('click', () => this.alignSeats('horizontal'));
    }

    handleSelection() {
        const activeObject = this.canvas.getActiveObject();
        if (activeObject && activeObject.type === 'seat' && !activeObject._objects) { // Ensure it's a single seat
            // Show rename dialog when double-clicking a seat
            activeObject.on('mousedblclick', () => {
                this.renameSeat(activeObject);
            });
        }
    }

    handleSelectionCleared() {
        // Optional: Add any cleanup needed when selection is cleared
    }

    removeSelectedSeats() {
        const activeObject = this.canvas.getActiveObject();
        if (activeObject) {
            if (activeObject.type === 'activeSelection') {
                // Remove multiple selected seats
                activeObject.forEachObject((obj) => {
                    this.canvas.remove(obj);
                });
                this.canvas.discardActiveObject();
            } else {
                // Remove single selected seat
                this.canvas.remove(activeObject);
            }
            this.canvas.requestRenderAll();
        }
    }

    renameSeat(seat) {
        Swal.fire({
            title: 'Rename Seat',
            input: 'text',
            inputValue: seat.seatLabel,
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value) {
                    return 'You need to enter a seat name!';
                }
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const newLabel = result.value;
                seat.item(1).set('text', newLabel);
                seat.seatLabel = newLabel;
                this.canvas.renderAll();
            }
        });
    }

    createSeat(left, top, label) {
        // Create seat shape with fixed color
        const seatRect = new fabric.Rect({
            left: left,
            top: top,
            width: this.seatSize,
            height: this.seatSize,
            fill: '#4CAF50',
            rx: 5,
            ry: 5,
            originX: 'center',
            originY: 'center'
        });

        // Create seat label
        const seatLabel = new fabric.Text(label, {
            left: left,
            top: top,
            fontSize: 12,
            fill: 'white',
            originX: 'center',
            originY: 'center'
        });

        // Create group with the elements
        const seatGroup = new fabric.Group([seatRect, seatLabel], {
            left: left,
            top: top,
            centeredRotation: true,
            snapAngle: 10,
            hasControls: true,
            hasBorders: true,
            lockScalingX: true,
            lockScalingY: true,
            seatLabel: label,
            originX: 'center',
            originY: 'center'
        });

        // Add double-click handler for renaming
        seatGroup.on('mousedblclick', () => {
            this.renameSeat(seatGroup);
        });

        return seatGroup;
    }

    addSingleSeat() {
        const label = `${this.currentRow}${this.currentSeatNumber}`;
        // Place single seat at center of canvas
        const seat = this.createSeat(
            this.centerX - (this.seatSize / 2), // Adjust for seat center
            this.startY,
            label
        );
        
        this.canvas.add(seat);
        this.currentSeatNumber++;
        this.canvas.renderAll();
    }

    addRow() {
        const rowName = document.getElementById('row-name').value || this.currentRow;
        const seatsCount = parseInt(document.getElementById('seats-count').value) || 8;
        
        const seats = [];
        
        // Calculate total width including all seats and gaps
        const spacing = this.gridSize + 10; // Space between seats
        const totalWidth = (seatsCount * this.seatSize) + ((seatsCount - 1) * spacing);
        
        // Calculate starting X position to center the row
        const startX = (this.canvas.width - totalWidth) / 2;
        let currentX = startX;

        // Create all seats first
        for (let i = 1; i <= seatsCount; i++) {
            const label = `${rowName}${i}`;
            const seat = this.createSeat(currentX, this.currentY, label);
            seats.push(seat);
            currentX += this.seatSize + spacing;
        }

        // Add all seats to canvas
        seats.forEach(seat => {
            this.canvas.add(seat);
        });

        // Create a selection of all seats in the row
        const selection = new fabric.ActiveSelection(seats, {
            canvas: this.canvas
        });

        // Center the selection on canvas
        // selection.centerH();
        selection.centerV();

        // Select all seats and align them horizontally
        this.canvas.setActiveObject(selection);
        this.alignSeats('horizontal');
        
        // Remove the selection but keep the seats in place
        this.canvas.discardActiveObject();

        this.currentRow = String.fromCharCode(rowName.charCodeAt(0) + 1);
        this.currentY += 45;
        this.canvas.renderAll();
    }

    updateSeatLabel(seat) {
        if (seat.seatLabel) {
            const newLabel = `${this.currentRow}${this.currentSeatNumber}`;
            seat.item(1).set('text', newLabel);
            seat.seatLabel = newLabel;
            this.currentSeatNumber++;
            this.canvas.renderAll();
        }
    }

    saveLayout() {
        const json = JSON.stringify(this.canvas.toJSON(['name']));
        localStorage.setItem('theatreLayout', json);
        Swal.fire('Success', 'Layout saved successfully!', 'success');
    }

    loadLayout() {
        const savedLayout = localStorage.getItem('theatreLayout');
        if (savedLayout) {
            this.canvas.loadFromJSON(savedLayout, () => {
                this.canvas.renderAll();
                // Reattach event handlers to screens
                this.canvas.getObjects().forEach(obj => {
                    if (obj.name === 'screen') {
                        obj.on('mousedblclick', () => {
                            const text = obj.getObjects('text')[0];
                            Swal.fire({
                                title: 'Edit Screen Text',
                                input: 'text',
                                inputValue: text.text,
                                showCancelButton: true,
                                inputValidator: (value) => {
                                    if (!value) {
                                        return 'You need to write something!';
                                    }
                                }
                            }).then((result) => {
                                if (result.isConfirmed) {
                                    text.set('text', result.value);
                                    this.canvas.renderAll();
                                }
                            });
                        });
                    }
                });
            });
        }
    }

    clearCanvas() {
        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, clear it!'
        }).then((result) => {
            if (result.isConfirmed) {
                this.canvas.clear();
                this.currentRow = 'A';
                this.currentSeatNumber = 1;
                this.currentY = this.startY;
                Swal.fire(
                    'Cleared!',
                    'Your canvas has been cleared.',
                    'success'
                );
            }
        });
    }

    alignSeats(direction) {
        const activeSelection = this.canvas.getActiveObject();
        if (!activeSelection || activeSelection.type !== 'activeSelection') {
            Swal.fire({
                title: 'Selection Required',
                text: 'Please select multiple seats to align',
                icon: 'warning'
            });
            return;
        }

        const objects = activeSelection.getObjects();
        if (objects.length < 2) return;

        // Reset rotation and lock scaling for all objects
        objects.forEach(obj => {
            obj.set({
                angle: 0,
                lockScalingX: true, // Ensure scaling is locked
                lockScalingY: true  // Ensure scaling is locked
            });
        });

        // Sort objects by their current position
        const sortedObjects = [...objects].sort((a, b) => {
            return direction === 'horizontal' ? a.left - b.left : a.top - b.top;
        });

        // Calculate spacing between seats with more space
        const spacing = this.gridSize + 4;
        
        if (direction === 'horizontal') {
            // Get the top position from the first seat for horizontal alignment
            const avgTop = sortedObjects.reduce((sum, obj) => sum + obj.top, 0) / sortedObjects.length;
            
            // Calculate total width needed
            const totalWidth = (objects.length - 1) * spacing;
            // Calculate leftmost possible position to keep seats within canvas
            const minLeft = this.seatSize / 2;
            const maxLeft = this.canvas.width - totalWidth - this.seatSize / 2;
            
            // Ensure starting position is within bounds
            let startLeft = Math.min(Math.max(sortedObjects[0].left, minLeft), maxLeft);
            
            sortedObjects.forEach((obj, index) => {
                const newLeft = startLeft + (index * spacing);
                obj.set({
                    left: Math.max(this.seatSize / 2, Math.min(newLeft, this.canvas.width - this.seatSize / 2)),
                    top: Math.min(Math.max(avgTop, this.seatSize / 2), this.canvas.height - this.seatSize / 2)
                });
            });
        } else {
            // Get the left position from the first seat for vertical alignment
            const avgLeft = sortedObjects.reduce((sum, obj) => sum + obj.left, 0) / sortedObjects.length;
            
            // Calculate total height needed
            const totalHeight = (objects.length - 1) * spacing;
            // Calculate topmost possible position to keep seats within canvas
            const minTop = this.seatSize / 2;
            const maxTop = this.canvas.height - totalHeight - this.seatSize / 2;
            
            // Ensure starting position is within bounds
            let startTop = Math.min(Math.max(sortedObjects[0].top, minTop), maxTop);
            
            sortedObjects.forEach((obj, index) => {
                const newTop = startTop + (index * spacing);
                obj.set({
                    top: Math.max(this.seatSize / 2, Math.min(newTop, this.canvas.height - this.seatSize / 2)),
                    left: Math.min(Math.max(avgLeft, this.seatSize / 2), this.canvas.width - this.seatSize / 2)
                });
            });
        }

        // Update the canvas and selection
        this.canvas.renderAll();
        activeSelection.setCoords();

        // Show success message
        Swal.fire({
            title: 'Success',
            text: `Seats aligned ${direction}ly`,
            icon: 'success',
            timer: 1000,
            showConfirmButton: false
        });
    }

    constrainMovement(e) {
        const obj = e.target;
        const maxLeft = this.canvas.width - this.seatSize;
        const maxTop = this.canvas.height - this.seatSize;

        // Constrain movement within canvas boundaries
        obj.set({
            left: Math.max(0, Math.min(obj.left, maxLeft)),
            top: Math.max(0, Math.min(obj.top, maxTop))
        });
    }

    enforceLocking() {
        const activeSelection = this.canvas.getActiveObject();
        if (activeSelection && activeSelection.type === 'activeSelection') {
            activeSelection.getObjects().forEach(obj => {
                obj.set({
                    lockScalingX: true,
                    lockScalingY: true
                });
            });
        }
    }

    createSeatsLayout() {
        // Clear existing canvas
        this.canvas.clear();

        // Define section configurations
        const sectionConfigs = {
            section_left: { 
                startX: 0,
                color: '#3498db',
                totalWidth: 0
            },
            section_center: { 
                startX: 0,
                color: '#2ecc71',
                totalWidth: 0
            },
            section_right: { 
                startX: 0,
                color: '#e74c3c',
                totalWidth: 0
            }
        };

        // Calculate total width for each section
        Object.keys(this.seats).forEach(sectionName => {
            const sectionConfig = sectionConfigs[sectionName];
            const sectionSeats = this.seats[sectionName];

            // Iterate through rows
            Object.keys(sectionSeats).forEach((row, rowIndex) => {
                const rowSeats = sectionSeats[row];
                
                // Calculate number of seats for centering
                const numSeats = rowSeats.length;
                const rowWidth = numSeats * this.gridSize;
                sectionConfig.totalWidth = Math.max(sectionConfig.totalWidth, rowWidth);
            });
        });

        // Iterate through each section
        Object.keys(this.seats).forEach(sectionName => {
            const sectionConfig = sectionConfigs[sectionName];
            const sectionSeats = this.seats[sectionName];

            // Determine section-specific X offset
            let sectionXOffset = 0;
            if (sectionName === 'section_left') {
                sectionXOffset = 0; // Left side
            } else if (sectionName === 'section_center') {
                sectionXOffset = this.centerX - (sectionConfig.totalWidth / 2); // Center
            } else if (sectionName === 'section_right') {
                sectionXOffset = this.canvas.width - sectionConfig.totalWidth; // Right side
            }

            // Iterate through rows
            Object.keys(sectionSeats).forEach((row, rowIndex) => {
                const rowSeats = sectionSeats[row];
                
                // Calculate number of seats for centering
                const numSeats = rowSeats.length;
                const rowWidth = numSeats * this.gridSize;
                const centerOffset = rowWidth / 2;

                // Iterate through seats in the row
                rowSeats.forEach((seatNumber, seatIndex) => {
                    // Calculate base position
                    const left = sectionXOffset + (seatIndex * this.gridSize);
                    const top = this.startY + (rowIndex * (this.gridSize + 20)); // 20px gap between rows

                    // Create seat with label
                    const seatLabel = `${row}${seatNumber}`;
                    const seat = this.createSeat(left, top, seatLabel);
                    
                    // Set seat properties
                    seat.set({
                        fill: sectionConfig.color,
                        opacity: 0.7,
                        angle: 0 // No rotation for straight layout
                    });

                    // Add seat to canvas
                    this.canvas.add(seat);
                });
            });
        });

        // Render canvas
        this.canvas.renderAll();
    }

    initializeSeatsLayout() {
        // You can call this method when the page loads or when needed
        this.createSeatsLayout();
    }

    addScreen() {
        // Add space between the screen and controls
        const screenWidth = 500;
        const screenHeight = 40;
        const screenText = 'SCREEN';

        // Create screen rectangle
        const rect = new fabric.Rect({
            width: screenWidth,
            height: screenHeight,
            fill: '#4a4a4a',
            rx: 5, // rounded corners
            ry: 5,
        });

        // Create screen text
        const text = new fabric.Text(screenText, {
            fontSize: 20,
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            originX: 'center',
            originY: 'center'
        });

        // Create screen group
        const screen = new fabric.Group([rect, text], {
            left: (this.canvas.width - screenWidth) / 2,
            top: 0, // Adjusted to remove unnecessary space
            selectable: true,
            hasControls: true,
            lockRotation: true,
            name: 'screen'
        });

        // Center the text in the rectangle
        text.set({
            left: rect.getCenterPoint().x,
            top: rect.getCenterPoint().y
        });

        // Add the screen to canvas
        this.canvas.add(screen);
        this.canvas.renderAll();

        // Bring screen to front
        screen.bringToFront();

        // Add double-click handler for text editing
        screen.on('mousedblclick', () => {
            Swal.fire({
                title: 'Edit Screen Text',
                input: 'text',
                inputValue: text.text,
                showCancelButton: true,
                inputValidator: (value) => {
                    if (!value) {
                        return 'You need to write something!';
                    }
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    text.set('text', result.value);
                    this.canvas.renderAll();
                }
            });
        });
    }
}


const seats = {
    section_left: {
        A: [31, 29, 27, 25, 23, 21, 19, 17],
        B: [37, 35, 33, 31, 29, 27, 25, 23, 21, 19],
        C: [41, 39, 37, 35, 33, 31, 29, 27, 25, 23, 21],
        D: [45, 43, 41, 39, 37, 35, 33, 31, 29, 27, 25, 23],
        E: [45, 43, 41, 39, 37, 35, 33, 31, 29, 27, 25, 23],
        F: [51, 49, 47, 45, 43, 41, 39, 37, 35, 33, 31, 29, 27],
        G: [55, 53, 51, 49, 47, 45, 43, 41, 39, 37, 35, 33, 31, 29, 27],
        H: [57, 55, 53, 51, 49, 47, 45, 43, 41, 39, 37, 35, 33, 31],
        I: [53, 51, 49, 47, 45, 43, 41, 39, 37, 35, 33, 31],
        J: [53, 51, 49, 47, 45, 43, 41, 39, 37, 35, 33],
        K: [55, 53, 51, 49, 47, 45, 43, 41, 39, 37, 35, 33]
    },
    section_center: {
        A: [15, 13, 11, 9, 7, 5, 3, 1, 2, 4, 6, 8, 10, 12, 14, 16],
        B: [17, 15, 13, 11, 9, 7, 5, 3, 1, 2, 4, 6, 8, 10, 12, 14, 16],
        C: [19, 17, 15, 13, 11, 9, 7, 5, 3, 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
        D: [21, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
        E: [21, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22],
        F: [25, 23, 21, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24],
        G: [25, 23, 21, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26],
        H: [29, 27, 25, 23, 21, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28],
        I: [29, 27, 25, 23, 21, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30],
        J: [31, 29, 27, 25, 23, 21, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30],
        K: [31, 29, 27, 25, 23, 21, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32]
    },
    section_right: {
        A: [18, 20, 22, 24, 26, 28, 30, 32],
        B: [18, 20, 22, 24, 26, 28, 30, 32, 34, 36],
        C: [22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42],
        D: [22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44],
        E: [24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44],
        F: [26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50],
        G: [28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56],
        H: [30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56],
        I: [32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54],
        J: [32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52],
        K: [34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56]
    }
};


// Initialize the seat builder when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new AdvancedTheatreSeatBuilder(seats);
});