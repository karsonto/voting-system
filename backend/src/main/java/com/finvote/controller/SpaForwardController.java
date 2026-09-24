package com.finvote.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * 前端为 React 单页应用，使用 history 路由。
 *
 * <p>用户直接访问或刷新 /admin、/judge、/board 时，需要把请求交回 index.html，
 * 由前端路由决定渲染哪个页面。静态资源与 /api 不受影响。</p>
 */
@Controller
public class SpaForwardController {

    @GetMapping({"/", "/admin", "/judge", "/board", "/overview"})
    public String forward() {
        return "forward:/index.html";
    }
}
