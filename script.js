class AdvancedTheatreSeatBuilder {
    constructor() {
        this.canvas = new fabric.Canvas('seat-canvas', {
            width: 1040,
            height: 600,
            backgroundColor: '#ffffff'
        });
        
        this.currentRow = 'A';
        this.currentSeatNumber = 1;
        this.seatSize = 30;
        this.gridSize = 34;
        
        // Calculate center positions
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        
        // Set starting Y position to be 150px from top
        this.startY = 150;
        this.currentY = this.startY;
        
        this.initializeEventListeners();
        
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

        // Add selection event to update UI
        this.canvas.on('selection:created', () => this.handleSelection());
        this.canvas.on('selection:updated', () => this.handleSelection());
        this.canvas.on('selection:cleared', () => this.handleSelectionCleared());

        // Add new alignment buttons to the tools panel
        const toolsPanel = document.querySelector('.tools-panel');
        const alignmentDiv = document.createElement('div');
        alignmentDiv.className = 'mb-3';
        alignmentDiv.innerHTML = `
            <div class="btn-group w-100">
                <button id="align-horizontal" class="btn btn-outline-primary">Horizontal</button>
            </div>
        `;
        
        // Insert alignment controls before the save button
        toolsPanel.insertBefore(alignmentDiv, document.getElementById('save-layout').parentNode);

        // Add event listeners for alignment buttons
        document.getElementById('align-horizontal').addEventListener('click', () => this.alignSeats('horizontal'));
        document.getElementById('align-vertical').addEventListener('click', () => this.alignSeats('vertical'));
    }

    handleSelection() {
        const activeObject = this.canvas.getActiveObject();
        if (activeObject) {
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
        // Ensure the seat does not cross the canvas border
        const maxLeft = this.canvas.width - this.seatSize;
        const maxTop = this.canvas.height - this.seatSize;
        left = Math.max(0, Math.min(left, maxLeft));
        top = Math.max(0, Math.min(top, maxTop));

        const seatGroup = new fabric.Group([], {
            left: left,
            top: top,
            centeredRotation: true,
            snapAngle: 10,
            originX: 'left',
            originY: 'top',
            subTargetCheck: true,
            interactive: true
        });

        // Create seat shape with fixed color
        const seatRect = new fabric.Rect({
            width: this.seatSize,
            height: this.seatSize,
            fill: '#4CAF50',
            rx: 5,
            ry: 5,
            originX: 'left',
            originY: 'top'
        });

        // Create seat label
        const seatLabel = new fabric.Text(label, {
            fontSize: 14,
            fill: 'white',
            originX: 'center',
            originY: 'center',
            left: this.seatSize / 2,
            top: this.seatSize / 2
        });

        seatGroup.addWithUpdate(seatRect);
        seatGroup.addWithUpdate(seatLabel);

        seatGroup.set({
            hasControls: true,
            hasBorders: true,
            lockScalingX: true,
            lockScalingY: true,
            seatLabel: label
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
        const layout = {
            seats: this.canvas.getObjects().map(obj => ({
                label: obj.seatLabel,
                position: {
                    left: obj.left,
                    top: obj.top
                }
            }))
        };

        const blob = new Blob([JSON.stringify(layout)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'theatre-layout.json';
        a.click();

        Swal.fire({
            title: 'Success!',
            text: 'Theatre layout has been saved!',
            icon: 'success',
            confirmButtonText: 'OK'
        });
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
}

// Initialize the seat builder when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new AdvancedTheatreSeatBuilder();
}); 