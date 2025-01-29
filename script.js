class AdvancedTheatreSeatBuilder {
    constructor() {
        this.canvas = new fabric.Canvas('seat-canvas', {
            width: 930,
            height: 600,
            backgroundColor: '#ffffff'
        });
        
        this.currentRow = 'A';
        this.currentSeatNumber = 1;
        this.seatSize = 40;
        this.gridSize = 41;
        
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

        // Create seat shape
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
        
        // Calculate total row width including all seats and gaps
        const totalWidth = (seatsCount * this.seatSize) + ((seatsCount - 1) * (this.gridSize - this.seatSize));
        
        // Calculate starting X position to center the row
        const startX = (this.canvas.width - totalWidth) / 2;
        let currentX = startX;

        for (let i = 1; i <= seatsCount; i++) {
            const label = `${rowName}${i}`;
            const seat = this.createSeat(currentX, this.currentY, label);
            this.canvas.add(seat);
            currentX += this.gridSize;
        }

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
}

// Initialize the seat builder when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new AdvancedTheatreSeatBuilder();
}); 