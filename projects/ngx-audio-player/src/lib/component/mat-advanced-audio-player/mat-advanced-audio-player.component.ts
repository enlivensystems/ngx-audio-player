import {Component, OnInit, Input, ViewChild, Output, EventEmitter} from '@angular/core';
import { AudioPlayerService } from '../../service/audio-player-service/audio-player.service';
import { Track } from '../../model/track.model';
import { BaseAudioPlayerFunctions } from '../base/base-audio-player-components';
import { MatSlider } from '@angular/material/slider';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';

@Component({
    selector: 'mat-advanced-audio-player',
    templateUrl: './mat-advanced-audio-player.component.html',
    styleUrls: ['./mat-advanced-audio-player.component.css']
})
export class MatAdvancedAudioPlayerComponent extends BaseAudioPlayerFunctions implements OnInit {

    displayedColumns: string[] = ['title', 'status', 'functions'];
    timeLineDuration: MatSlider;

    dataSource = new MatTableDataSource<Track>();

    paginator: MatPaginator;

    playlistData: Track[];

    @Input()
    displayTitle = true;

    @Input()
    displayPlaylist = true;

    @Input()
    pageSizeOptions = [10, 20, 30];

    @Input()
    expanded = true;

    @Input()
    autoPlay = false;

    @Input()
    displayVolumeControls = true;

    @Input()
    audioLoadingErrorText = 'Failed to load: ';
    @Input()
    audioLoadingInProgressText = 'Please wait while the audio is loading: ';

    @Input()
    clearPlaylistText = 'Clear playlist';

    @Input()
    errorColor = '#D65251';
    @Input()
    errorText = 'Failed to load the song, click here to try again!';

    @Input()
    removePlaylistElementEnabled = false;

    @Input()
    removePlaylistElementText = 'Remove';

    @Input()
    playlistTitleText = 'Play List';

    @Output()
    clearPlaylist: EventEmitter<void> = new EventEmitter();

    @Output()
    removePlaylistElementByID: EventEmitter<string> = new EventEmitter();

    @Output()
    playerLoadError: EventEmitter<any> = new EventEmitter();

    audioLoadingError = false;
    playlistTrack: any;

    constructor(private playlistService: AudioPlayerService) {
        super();
    }

    ngOnInit() {
        this.setDataSourceAttributes();
        this.bindPlayerEvent();
        this.player.nativeElement.addEventListener('canplay', () => {
            console.log('audio canplay');
            this.audioLoadingError = false;
        });
        this.player.nativeElement.addEventListener('ended', () => {
            if (this.checkIfSongHasStartedSinceAtleastTwoSeconds()) {
                this.nextSong();
            }
        });
        this.player.nativeElement.addEventListener('error', (event) => {
            console.log('Error while loading audio!');
            console.log(event);
            this.audioLoadingError = true;
            this.playerLoadError.emit(this.playlistTrack);
        });
        this.player.nativeElement.addEventListener('loadstart', () => {
            console.log('audio loadstart');
            this.audioLoadingError = false;
        });
        this.player.nativeElement.addEventListener('waiting', () => {
            console.log('audio waiting');
            this.audioLoadingError = false;
        });
        this.playlistService.setPlaylist(this.playlistData);
        this.playlistService.getSubjectCurrentTrack().subscribe((playlistTrack) => {
            this.playlistTrack = playlistTrack;
        });
        this.player.nativeElement.currentTime = 0;
        this.playlistService.init();
        if (this.autoPlay) {
            super.play();
        }
    }

    @ViewChild(MatPaginator, { static: false }) set matPaginator(mp: MatPaginator) {
        this.paginator = mp;
        this.setDataSourceAttributes();
    }

    setDataSourceAttributes() {
        let index = 1;
        if (this.playlistData) {
            this.playlistData.forEach(data => {
                data.index = index++;
            });
            this.dataSource = new MatTableDataSource<Track>(this.playlistData);
            this.dataSource.paginator = this.paginator;
        }
    }

    nextSong(): void {
        if (this.displayPlaylist == true
            && (((this.playlistService.indexSong + 1) % this.paginator.pageSize) === 0
                || (this.playlistService.indexSong + 1) === this.paginator.length)) {
            if (this.paginator.hasNextPage()) {
                this.paginator.nextPage();
            } else if (!this.paginator.hasNextPage()) {
                this.paginator.firstPage();
            }
        }
        this.currentTime = 0;
        this.duration = 0.01;
        this.playlistService.nextSong();
        this.play();
    }

    previousSong(): void {
        this.currentTime = 0;
        this.duration = 0.01;
        if (!this.checkIfSongHasStartedSinceAtleastTwoSeconds()) {
            if (this.displayPlaylist == true
                && (((this.playlistService.indexSong) % this.paginator.pageSize) === 0
                    || (this.playlistService.indexSong) === 0)) {
                if (this.paginator.hasPreviousPage()) {
                    this.paginator.previousPage();
                } else if (!this.paginator.hasPreviousPage()) {
                    this.paginator.lastPage();
                }
            }
            this.playlistService.previousSong();
        } else {
            this.resetSong();
        }
        this.play();
    }

    resetSong(): void {
        this.player.nativeElement.src = this.playlistTrack[1].link;
    }

    retryOrPlay(): void {
        if (!this.audioLoadingError) {
            this.playBtnHandler();
        } else {
            if (this.playlistTrack.index) {
                this.selectTrack(this.playlistTrack.index);
            } else {
                console.log('No valid playlist track index found, loading first track.');
                this.selectTrack(0);
            }
        }
    }

    selectTrack(index: number): void {
        console.log('selectTrack(index: number): void: ' + index);
        this.playlistService.selectATrack(index);
        setTimeout(() => {
            this.player.nativeElement.play();
        }, 0);
    }

    checkIfSongHasStartedSinceAtleastTwoSeconds(): boolean {
        return this.player.nativeElement.currentTime > 2;
    }

    @Input()
    set playlist(playlist: Track[]) {
        this.playlistData = playlist;
        this.ngOnInit();
    }
}
