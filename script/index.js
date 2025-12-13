const g_inviewStayTime = 100;   // 100ms = 0.1s

$(function() {
  inviewObserver();
  norenManage();
  modalManage();
  sliderManage();
  min816Move();
  dragImg();
});


// ----------------------------------------------
// js-observer がｳｲﾝﾄﾞｳ領域内で初回表示されたら is-inview ｸﾗｽを追加
// ----------------------------------------------
function inviewObserver() {
  u_inview($(".js-observer"), 400, 0.2, (isInview, target) => {
    if (isInview) {
      $(target).addClass("is-inview");
    }
  });
}


// ----------------------------------------------
// js-noren__item に関する処理を管理
// ----------------------------------------------
function norenManage() {
  let isClick = false;

  viewArticle();
  autoFold();


  // --------------------------------------------
  // js-noren__item のｸﾘｯｸで自身を めくり 、対応する js-article に移動
  // --------------------------------------------
  function viewArticle() {
    $(".js-noren").on("click", ".js-noren__item", function(eClick) {
      isClick = true;

      // ｸﾘｯｸした js-noren__item をめくる
      $(".js-noren__item").removeClass("is-fold");
      $(this).addClass("is-fold");

      // ｸﾘｯｸした js-noren__item と同じ data値 を持つ js-article に移動
      const $moveToArticle   = $(".js-article[data-article='" + $(this).data("article") + "']");
      const moveToArticleTop = $moveToArticle.offset().top;
      const duration         = Math.abs(moveToArticleTop - eClick.pageY) * 0.4;
      const scrollStartPos   = window.scrollY;
      const scrollDistance   = moveToArticleTop - scrollStartPos - $(".js-noren").height();

      let startTime = undefined;
      function scrollAnimation(timestamp) {
        // 1ﾌﾚｰﾑ目が呼ばれた ﾍﾟｰｼﾞﾛｰﾄﾞからの経過時間 を保持
        if (startTime == undefined) startTime = timestamp;

        // timestamp (現時点の ﾍﾟｰｼﾞﾛｰﾄﾞからの経過時間) -startTime (1ﾌﾚｰﾑ時点の ﾍﾟｰｼﾞﾛｰﾄﾞからの経過時間) で、ｱﾆﾒｰｼｮﾝ開始からの経過時間 を算出
        // ｱﾆﾒｰｼｮﾝ開始からの経過時間 / duration (ｱﾆﾒｰｼｮﾝ総再生時間) で、総再生時間に対する進捗割合 (0 ~ 1) を算出
        // 進捗割合 が 1 を超えないように min() で制限
        const progress = Math.min((timestamp - startTime) / duration, 1);

        // 加速度係数の計算
        let ease;
        // → 進捗が 0.5 未満の場合は加速
        if (progress < 0.5) {
          ease = 2 * progress * progress;
        }
        // → 進捗が 0.5 以降の場合は減速
        else {
          ease = -1 + (4 - 2 * progress) * progress;
        }

        // scrollTo(x, y)
        // ｳｲﾝﾄﾞｳｽｸﾛｰﾙの開始時点 に ｽｸﾛｰﾙ距離 * 加速度係数 を加算したｽｸﾛｰﾙ地点まで、1ﾌﾚｰﾑごとにｽｸﾛｰﾙさせる
        window.scrollTo(0, scrollStartPos + scrollDistance * ease);

        // 進捗割合 が 1 になるまで上記を繰り返す
        if (progress < 1) {
          requestAnimationFrame(scrollAnimation);
        }
        else {
          isClick = false;
        }
      }

      // requestAnimationFrame で呼ぶ関数には（任意の）引数を渡すことができない
      // 渡されるのは、自動で渡される timestamp のみ
      // timestamp → ﾍﾟｰｼﾞﾛｰﾄﾞからの経過時間を順次保持する DOMHihgResTimeStamp 型の変数
      //             慣例的に timestamp という変数名に命名されることが多い
      requestAnimationFrame(scrollAnimation);
    });
  }


  // --------------------------------------------
  // ｳｲﾝﾄﾞｳｽｸﾛｰﾙで js-noren__item を自動でめくる
  // --------------------------------------------
  function autoFold() {
    let articleRanges = [];

    getArticleRanges();


    // ------------------------------------------
    // ﾘｻｲｽﾞの終了時に articleRanges を再取得
    // > ﾘｻｲｽﾞごとの setTimeout はその都度ｷｬﾝｾﾙし、最後に呼ばれた setTimeout だけを処理する
    // ------------------------------------------
    let timer;
    $(window).on("resize", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        getArticleRanges();
      }, 200);
    });
    

    // ------------------------------------------
    // ｳｲﾝﾄﾞｳｽｸﾛｰﾙで、ｳｲﾝﾄﾞｳの半分以上を占める js-article に紐づく js-noren__item をめくる
    // viewArticle によるｽｸﾛｰﾙ時は対象外
    // ------------------------------------------
    let saveArticle;
    $(window).on("scroll", () => {
      if (isClick) return;
      const scrollCenter = $(window).scrollTop() + $(window).height() / 2;
      articleRanges.forEach((el) => {
        if ((el.top <= scrollCenter) && (scrollCenter < el.bottom)) {
          if (saveArticle == el.article) return;
          $(".js-noren__item").removeClass("is-fold");
          $(".js-noren__item[data-article='" + el.article + "']").addClass("is-fold");
          saveArticle = el.article;
          return;
        }
      });
    })


    // ------------------------------------------
    // js-article ごとの表示領域 (top と bottom) を取得
    // ------------------------------------------
    function getArticleRanges() {
      articleRanges = [];
      $(".js-article").each(function(ix) {
        const article = $(this).data("article");
        const top     = $(this).offset().top;
        let   bottom;

        if (ix < $(".js-article").length - 1) {
          bottom = $(".js-article").eq(ix + 1).offset().top;
        }
        else {
          bottom = $("html")[0].scrollHeight;
        }
        // 後ほどｷｰで参照できるよう ｷｰ:値 で登録
        articleRanges.push({article: article, top: top, bottom: bottom});
      });
    }
  }
}


// ----------------------------------------------
// ﾓｰﾀﾞﾙ画面と、関係する処理を管理
// ----------------------------------------------
function modalManage() {
  setModal();
  showModal();
  hoverCloseBtn();
  closeModal();


  // --------------------------------------------
  // ｳｲﾝﾄﾞｳｽｸﾛｰﾙの禁止/許可時に呼ばれる
  // --------------------------------------------
  function prevent(e) {
    e.preventDefault();
  }


  // --------------------------------------------
  // 各menu配下に位置する js-copy-source を、js-modal__wrapper 配下に複製
  // --------------------------------------------
  function setModal() {
    $(".js-copy-source").each(function() {
      const dataMenu   = $(this).parent().data("menu");
      const $modalItem = $("<li>")
        .addClass("modal__item js-modal__item")
        .attr("data-menu", dataMenu)
        .append($(this).children().clone());
      $(".js-modal__wrapper").append($modalItem);
    });
  }


  // --------------------------------------------
  // js-menu__item のｸﾘｯｸで、ﾓｰﾀﾞﾙ画面 及び、紐づく js-modal__item を表示
  // --------------------------------------------
  function showModal() {
    $(".menu").on("click", ".js-menu__item", function() {
      const clickMenu = $(this).data("menu");

      $(".js-modal").addClass("is-show");
      $(".js-modal__item[data-menu='" + clickMenu + "']").addClass("is-show");

      // ｳｲﾝﾄﾞｳｽｸﾛｰﾙの禁止
      document.addEventListener("wheel", prevent, {passive: false});
    });
  }


  // --------------------------------------------
  // js-modal__close-btn のﾎﾊﾞｰで、js-modal__close-btn__inner を回転
  // --------------------------------------------
  function hoverCloseBtn() {
    const $inner      = $(".js-modal__close-btn__inner");
    const delay       = u_getDuration($inner, "transform") * 5;
    let   closeBtnDeg = 0;
    let   repeatRotate;

    $(".js-modal").on("pointerenter", ".js-modal__close-btn", function() {
      closeBtnDeg += 90;
      $inner.css({"transform": `rotate(${closeBtnDeg}deg)`});

      repeatRotate = setInterval(() => {
        closeBtnDeg += 90;
        $inner.css({"transform": `rotate(${closeBtnDeg}deg)`});
      }, delay);
    });

    $(".js-modal").on("pointerleave", ".js-modal__close-btn", function() {
      clearInterval(repeatRotate);
    });
  }


  // --------------------------------------------
  // js-modal__bg または js-modal__close-btn のｸﾘｯｸで、js-modal を閉じる
  // --------------------------------------------
  function closeModal() {
    $(".js-modal").on("click", ".js-modal__bg, .js-modal__close-btn", function() {
      $(".js-modal").removeClass("is-show");
      $(".js-modal__item").removeClass("is-show");

      // ｳｲﾝﾄﾞｳｽｸﾛｰﾙを許可
      document.removeEventListener("wheel", prevent, {passive: false});
    });
  }
}


// ----------------------------------------------
// js-sub-img__slide に関する処理を管理
// ----------------------------------------------
function sliderManage() {
  const $section  = $("[data-article='inside'] .js-section");
  const slideNum  = 3;
  const maxZIndex = slideNum - 1;

  // root変数 --time-sub-time-delay-ix** の値を取得
  const rootStyles = getComputedStyle(document.documentElement);
  let   delayList = [];
  for (let i = 1; i <= slideNum; i++) {
    delayList.push(rootStyles.getPropertyValue("--time-sub-img-delay-ix0" + i));
  }

  $section.each(function() {
    const $slide   = $(this).find(".js-sub-imgs__slide");
    const $dotFill = $(this).find(".js-sub-imgs__dot-fill");
  
    // 初回ﾛｰﾄﾞ時
    for (let i = 0; i < slideNum; i++) {
      setDelay($slide.eq(i), $dotFill.eq(i), (maxZIndex - i), delayList[i]);
    }
    $slide.css("animation-play-state", "running");
    $dotFill.css("animation-play-state", "running");

    // 次回以降
    clickDot($(this), $slide, $dotFill);
  });


  // --------------------------------------------
  // js-sub-img__dot-fill のｸﾘｯｸに伴う処理
  // --------------------------------------------
  function clickDot($section, $slide, $dotFill) {
    const slideAnimName   = $slide.css("animation-name");
    const dotFillAnimName = $dotFill.css("animation-name");

    $section.on("click", ".js-sub-imgs__dot", function() {
      const clickData = $(this).data("sub-img");

      // ｱﾆﾒｰｼｮﾝ中断
      $slide.css("animation-name", "none");
      $dotFill.css("animation-name", "none");

      // 強制ﾘﾌﾛｰで none を確定
      // → 全体に強制ﾘﾌﾛｰが適用されるので、$slide[0] でなくてもいいが代表して選択
      void $slide[0].offsetHeight;

      // delay値 の再ｾｯﾄ
      let currentIx = 0;
      for (let i = 0; i < slideNum; i++) {
        if (($slide.eq(i).data("sub-img") == clickData) || (currentIx > 0)) {
          setDelay($slide.eq(i), $dotFill.eq(i), (maxZIndex - currentIx), delayList[currentIx]);
          currentIx += 1;
        }
      }
      for (let i = 0; i < slideNum; i++) {
        if (currentIx >= slideNum) break;
        setDelay($slide.eq(i), $dotFill.eq(i), (maxZIndex - currentIx), delayList[currentIx]);
        currentIx += 1;
      }

      // ｱﾆﾒｰｼｮﾝ名 の再ｾｯﾄ (再生開始)
      $slide.css("animation-name", slideAnimName);
      $dotFill.css("animation-name", dotFillAnimName);
    });
  }


  // --------------------------------------------
  // 単一の $slide と $sotFill の z-index と delay を上書き
  // --------------------------------------------
  function setDelay($slide, $dotFill, zIndex, delay) {
    $slide.css({
      "z-index"        : zIndex,
      "animation-delay": delay,
    });
    $dotFill.css("animation-delay", delay);
  }
}


// ----------------------------------------------
// ｳｲﾝﾄﾞｳ幅816pxを跨ぐﾘｻｲｽﾞ時 js-min816-move を移動
// > 移動後 (幅816px前後) のﾚｲｱｳﾄは css の @media で対応し、本処理では移動するだけ
// > width() はｽｸﾛｰﾙﾊﾞｰを含まないので、innerWidth を採用
// ----------------------------------------------
function min816Move() {
  const $section  = $("[data-article='inside'] .js-section");
  const $p        = $("[data-article='inside'] .js-min816-move");
  let   saveWidth = window.innerWidth;

  if (window.innerWidth >= 816) {
    $section.each(function(ix) {
      $(this).children(".js-wrapper").append($p.eq(ix));
    });
    
  }

  $(window).on("resize", function() {
    const currentWidth = window.innerWidth;
    if ((saveWidth < 816) && (816 <= currentWidth)) {
      $section.each(function(ix) {
        $(this).children(".js-wrapper").append($p.eq(ix));
      });
      
    }
    else if ((saveWidth >= 816) && (816 > currentWidth)) {
      $section.each(function(ix) {
        $(this).append($p.eq(ix));
      });
      
    }
    saveWidth = currentWidth;
  });
}


// ----------------------------------------------
// js-msg のﾄﾞﾗｯｸﾞ
// > pc用のため pointerdown ではなく、mousedown で pc用だと明示
// ----------------------------------------------
function dragImg() {
  const zIndex = parseInt($(".js-drag").css("z-index"), 10);

  $(".wide-bg").on("mousedown", ".js-drag", function(eDown) {
    const $el   = $(this);
    const diffX = eDown.clientX - $el.position().left;
    const diffY = eDown.clientY - $el.position().top;

    $(".js-drag").css("z-index", zIndex);
    $el.css("z-index", zIndex + 1);

    // ﾌﾞﾗｳｻﾞの画像選択ﾓｰﾄﾞをｷｬﾝｾﾙ (css の user-select は img ﾀｸﾞには効かない)
    eDown.preventDefault();

    $(window).on("mousemove.drag", function(eMove) {
      const moveX = eMove.clientX - diffX;
      const moveY = eMove.clientY - diffY;

      $el.css({
        "top" : moveY + "px",
        "left": moveX + "px",
      });
    });

    $(window).on("mouseup.drag", function() {
      $(window).off(".drag");
    });
  });
}