$(document).ready(function() {
    // 엑셀 다운로드 버튼
    $('.btn-excel').on('click', function() {
        console.log('엑셀 다운로드');
        // 엑셀 다운로드 로직
    });
    
    // 출력 버튼
    $('.btn-print').on('click', function() {
        console.log('출력');
        // 출력 로직
    });
    
    // 승인 버튼
    $('.btn-approve').on('click', function() {
        console.log('승인');
        // 승인 로직
    });
    
    // 기본 버튼들
    $('.btn-new').on('click', function() {
        console.log('신규');
    });
    
    $('.btn-edit').on('click', function() {
        console.log('수정');
    });
    
    $('.btn-delete').on('click', function() {
        console.log('삭제');
    });
});